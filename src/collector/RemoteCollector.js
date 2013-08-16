var fs = require('fs'),
    path = require('path'),
    util = require('util');

var _ = require('lodash'),
    async = require('async'),
    filesize = require('filesize'),
    mediainfo = require('mediainfo'),
    temp = require('temp'),
    winston = require('winston');

var AbstractCollector = require('./AbstractCollector'),
    RemoteDirectoryReader = require('./util/RemoteDirectoryReader');

/**
 * This class is intended as a base class for collectors that access files on remote systems.
 *
 * For each found file a RemoteCollector performs a partial download, saves it to a temporary file and runs `mediainfo`
 * on it. In most cases all necessary information is stored in the file header so there is no need to download the
 * entire thing.
 *
 * Subclasses must override the {@link #processDirectory} method which is used by the internal
 * {@link guerrero.collector.util.RemoteDirectoryReader RemoteDirectoryReader}. They should also respect the
 * {@link #cfg-chunkSize} setting if possible.
 *
 * @class guerrero.collector.RemoteCollector
 * @extends guerrero.collector.AbstractCollector
 * @abstract
 * @constructor
 * @param {Object=} options
 * @cfg {number} [chunkSize=10000] The minimum number of bytes to download. Subclasses may download more if necessary
 *                                 but should not download less.
 */
var RemoteCollector = function (options) {
    /*jshint -W106*/
    RemoteCollector.super_.apply(this, arguments);
    /*jshint +W106*/

    var opts = _.defaults(options || {}, {
        chunkSize: 10 * 1000
    });

    this.chunkSize = opts.chunkSize;
};

util.inherits(RemoteCollector, AbstractCollector);


/*jshint -W030*/
/**
 * The desired chunkSize. See {@link #cfg-chunkSize}
 *
 * @protected
 * @readonly
 * @property {number} chunkSize
 */
RemoteCollector.prototype.chunkSize;


/**
 * The "per-directory version" of `{@link #list}` used to recursively traverse the remote file system (or equivalent
 * thereof). Subclasses must return a list of all files and direct subdirectories in the specified directory.
 *
 * @protected
 * @abstract
 * @method processDirectory
 * @param {string} directory The directory to traverse.
 * @param {Function} callback
 * @param {?Object} callback.err The error object.
 * @param {{directories:Array.<string>,files:Array.<{name:string,size:number}>}} callback.res The result object.
 */
RemoteCollector.prototype.processDirectory;


/**
 * Downloads a chunk the specified file (see {@link #cfg-chunkSize}).
 *
 * @protected
 * @abstract
 * @method downloadChunk
 * @param {string} file
 * @param {Function} callback
 * @param {?Object} callback.err
 * @param {Buffer} callback.buffer
 */
RemoteCollector.prototype.downloadChunk;
/*jshint +W030*/


/**
 * @protected
 * @inheritdoc
 */
RemoteCollector.prototype.list = function (directory, callback) {
    new RemoteDirectoryReader({
        process: this.processDirectory.bind(this),
        format: this.formatFile.bind(this)
    }).run(directory, callback);
};


/**
 * @protected
 * @inheritdoc
 */
RemoteCollector.prototype.loadMediaInfo = function (file, callback) {
    var self = this;

    async.waterfall([
        function (cb) {
            self._downloadChunkToTemporaryFile(file, cb);
        },
        function (tmpFile, cb) {
            mediainfo(tmpFile, cb);
        }
    ], function (err, info) {
        if (err) {
            winston.error('error loading information for file "%s"', self.formatFile(file));
        }
        callback(err, info);
    });
};


/**
 * Downloads a chunk of the given file and saves it to a local temporary file.
 *
 * @private
 * @param {string} file The original name of the remote file.
 * @param {Function} callback
 * @param {?Object} callback.err The error object.
 * @param {string} callback.filename The name of the temporary file to which the data was saved.
 */
RemoteCollector.prototype._downloadChunkToTemporaryFile = function (file, callback) {
    var self = this,
        ffile = this.formatFile(file),
        tmpFile;

    async.waterfall([
        function (cb) {
            winston.silly('creating temporary file for file "%s"', ffile);
            temp.open({
                prefix: 'guerrero-',
                suffix: path.extname(file)
            }, cb);
        },
        function (temporaryFile, cb) {
            tmpFile = temporaryFile;

            winston.debug(
                'downloading up to %s of file "%s"',
                filesize(self.chunkSize, 1, false), ffile
            );
            self.downloadChunk(file, cb);
        },
        function (buffer, cb) {
            winston.debug(
                'writing partial download of "%s" to temporary file "%s"',
                ffile, tmpFile.path
            );
            fs.write(tmpFile.fd, buffer, 0, buffer.length, 0, cb);
        },
        function (bytesWritten, buffer, cb) {
            winston.silly(
                'closing temporary file "%s" (%s written)',
                tmpFile.path, filesize(bytesWritten, 1, false)
            );
            fs.close(tmpFile.fd, cb);
        },
        function (cb) {
            winston.silly('temporary file "%s" closed successfully', tmpFile.path);
            cb(null);
        }
    ], function (err) {
        if (err) {
            winston.error('saving file "%s" to a temporary file failed', ffile, err);
            callback(err);
        } else {
            callback(null, tmpFile.path);
        }
    });
};


/**
 * @ignore
 */
module.exports = RemoteCollector;
