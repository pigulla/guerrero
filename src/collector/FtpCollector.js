var fs = require('fs'),
    util = require('util');

var _ = require('lodash'),
    FtpClient = require('ftp'),
    S = require('string'),
    winston = require('winston');

var RemoteCollector = require('./RemoteCollector'),
    CurlFtp = require('./util/CurlFtp');

/**
 * Foo!
 *
 * @class guerrero.collector.FtpCollector
 * @extends guerrero.collector.RemoteCollector
 * @constructor
 * @param {Object} options
 * @cfg {string} [host="localhost"] The hostname.
 * @cfg {number} [port=21] The port.
 * @cfg {string} [user="anonymous"] The username.
 * @cfg {?string} [password=null] The password.
 */
function FtpCollector(options) {
    /*jshint -W106*/
    FtpCollector.super_.apply(this, arguments);
    /*jshint +W106*/

    var opts = _.defaults(options || {}, {
        host: 'localhost',
        port: 21,
        user: 'anonymous',
        password: null
    });

    this._client = new FtpClient();
    this._curl = new CurlFtp(opts);
    this._remote = opts;
}

util.inherits(FtpCollector, RemoteCollector);


/*jshint -W030*/
/**
 * The FTP client.
 *
 * @private
 * @property {FtpClient} _client
 */
FtpCollector.prototype._client;

/**
 * The CurlFtp instance.
 *
 * @private
 * @property {guerrero.collector.util.CurlFtp} _curl
 */
FtpCollector.prototype._curl;


/**
 * The configuration needed to connect to the remote FTP host.
 *
 * @private
 * @property {Object} _remote
 * @property {string} _remote.host
 * @property {number} _remote.port
 * @property {string} _remote.user
 * @property {string} _remote.password
 */
FtpCollector.prototype._remote;
/*jshint +W030*/


/**
 * @protected
 * @inheritdoc
 */
FtpCollector.prototype.formatFile = function (file) {
    return 'ftp://' + this._remote.user + '@' + this._remote.host + file;
};


/**
 * @protected
 * @inheritdoc
 */
FtpCollector.prototype.list = function (directory, callback) {
    var self = this,
        dir = S(directory).ensureLeft('/').chompRight('/').s;

    winston.info('collecting files from "%s"', this.formatFile(dir));

    this._client.connect(this._remote);
    this._client.on('ready', function () {
        /*jshint -W106*/
        FtpCollector.super_.prototype.list.call(self, dir, function (err, files) {
            self._client.end();
            callback(err, files);
        });
    });
};


/**
 * @protected
 * @inheritdoc
 */
FtpCollector.prototype.downloadChunk = function (file, callback) {
    this._curl.downloadFileChunk(file, this.chunkSize, callback);
};


/**
 * @protected
 * @inheritdoc
 */
FtpCollector.prototype.processDirectory = function (directory, callback) {
    this._client.list(directory, function (err, files) {
        if (err) {
            callback(err);
        } else {
            var result = {
                files: [],
                directories: []
            };

            // process all found files
            files.forEach(function (file) {
                var fullPath = S(directory).ensureRight('/') + file.name;

                if (file.type === 'l') {
                    winston.warn('ignoring symlink "%s"', fullPath);
                } else if (file.type === '-') {
                    result.files.push({
                        name: fullPath,
                        size: file.size
                    });
                } else if (file.type === 'd' && !/^\.{1,2}$/.test(file.name)) {
                    result.directories.push(fullPath);
                }
            });

            callback(null, result);
        }
    });
};

/**
 * @ignore
 */
module.exports = FtpCollector;
