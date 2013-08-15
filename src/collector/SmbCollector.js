var util = require('util');

var _ = require('lodash'),
    S = require('string');

var Client = require('./util/SmbClient'),
    Parser = require('./util/SmbParser'),
    RemoteCollector = require('./RemoteCollector.js');


/**
 * A collector that traverses a Samba share using `smbclient` and `smbget`.
 *
 * @class guerrero.collector.SmbCollector
 * @extends guerrero.collector.RemoteCollector
 * @constructor
 * @param {Object=} options
 */
function SmbCollector(options) {
    /*jshint -W106*/
    SmbCollector.super_.apply(this, arguments);
    /*jshint +W106*/

    var opts = _.defaults(options || {}, {
        service: '',
        username: null,
        password: null
    });

    this._service = opts.service;
    this._username = opts.username;

    this._client = new Client({
        service: opts.service,
        username: opts.username,
        password: opts.password
    });
}

util.inherits(SmbCollector, RemoteCollector);


/*jshint -W030*/
/**
 * The service name, e.g. `//myserver/tvseries`.
 *
 * @private
 * @property {string} _service
 */
SmbCollector.prototype._service;

/**
 * The username.
 *
 * @private
 * @property {string} _username
 */
SmbCollector.prototype._username;

/**
 * The Samba client.
 *
 * @private
 * @property {guerrero.collector.util.SmbClient} _client
 */
SmbCollector.prototype._client;
/*jshint +W030*/


/**
 * @protected
 * @inheritdoc
 */
SmbCollector.prototype.formatFile = function (file) {
    var srv = S(this._service).chompLeft('//').s;
    return util.format(
        'smb://%s@%s%s',
        this._username || 'guest', srv, file
    );
};


/**
 * @protected
 * @inheritdoc
 */
SmbCollector.prototype.processDirectory = function (directory, callback) {
    this._client.ls(directory, function (err, output) {
        if (err) {
            callback(err);
            return;
        }

        var ls = Parser.ls(output),
            result = {
                files: [],
                directories: []
            },
            skipDot = function (directory) {
                return !/^\.{1,2}$/.test(directory.name);
            };

        result.files = ls.files.map(function (file) {
            return {
                name: directory + '/' + file.name,
                size: file.size
            };
        });
        result.directories = ls.directories.filter(skipDot).map(function (file) {
            return directory + '/' + file.name;
        });

        callback(null, result);
    });
};


/**
 * @protected
 * @inheritdoc
 */
SmbCollector.prototype.downloadChunk = function (file, callback) {
    this._client.downloadFileChunk(file, this.chunkSize, callback);
};


/**
 * @ignore
 */
module.exports = SmbCollector;
