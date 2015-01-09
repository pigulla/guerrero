var childprocess = require('child_process'),
    util = require('util');

var _ = require('lodash'),
    filesize = require('filesize'),
    S = require('string'),
    shellquote = require('shell-quote'),
    winston = require('winston');

var CliHelper = require('../../util/CliHelper');

/**
 * A lightweight wrapper around the `curl` command line utility for FTP connections.
 *
 * Check out the [curl website][1] for more information.
 *
 * [1]: http://curl.haxx.se/
 *
 * @class guerrero.collector.util.CurlFtp
 * @constructor
 * @param {Object=} options
 * @cfg {string} [host="localhost"] The host to connect to.
 * @cfg {number} [port=21] The port of the remove server.
 * @cfg {string} [user="anonymous"] The name of the user.
 * @cfg {string} [password="guest"] The password.
 */
function CurlFtp(options) {
    this.opts = _.defaults(options || {}, {
        host: 'localhost',
        port: 21,
        user: 'anonymous',
        password: 'guest'
    });
}

/**
 * Generates the command line string to have `curl` download the given file.
 *
 * @private
 * @param {string} url The url of the file.
 * @param {number} size The size of the chunk.
 * @param {boolean} [maskPassword=false] If `true`, mask the password (e.g., when logging).
 * @return {string}
 */
CurlFtp.prototype._getDownloadCommand = function (url, size, maskPassword) {
    var password = maskPassword ? CliHelper.MASKED_PASSWORD : this.opts.password,
        args = new CliHelper({ separator: ' ' }).set({
            'no-epsv': true,
            silent: true,
            'speed-time': 1,
            user: this.opts.user + ':' + password,
            range: '0-' + (size - 1)
        });

    return util.format('curl %s %s', args.toString(), shellquote.quote([url]));
};

/**
 * Downloads part of a file.
 *
 * @param {string} file The full path of the file to download.
 * @param {number} size The size of the chunk to download.
 * @param {Function} callback
 * @param {?Object} callback.err The error object.
 * @param {Buffer} callback.res The raw data.
 */
CurlFtp.prototype.downloadFileChunk = function (file, size, callback) {
    // Yes, the "binary" encoding type is deprecated. Please check out this question on SO as to why we use it anyway:
    // http://stackoverflow.com/questions/17563977
    var url = util.format(
            'ftp://%s:%s%s',
            this.opts.host, this.opts.port, S(file).ensureLeft('/').s
        ),
        cmd = this._getDownloadCommand(url, size),
        options = {
            maxBuffer: size,
            encoding: 'binary'
        };

    winston.silly('executing "%s"', this._getDownloadCommand(file, size, true));
    childprocess.exec(cmd, options, function (err, stdout, stderr) {
        if (err) {
            winston.error('command failed: %s', err.toString());
            winston.debug('stderr output was: "%s"', stderr.toString());
            callback(err);
        } else {
            winston.silly(
                'download of "%s" complete (%s read)',
                url, filesize(stdout.length, 1, false)
            );
            callback(null, new Buffer(stdout, 'binary'));
        }
    });
};

/**
 * @ignore
 */
module.exports = CurlFtp;
