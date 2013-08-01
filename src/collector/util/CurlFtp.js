var childprocess = require('child_process'),
    util = require('util');

var _ = require('lodash'),
    filesize = require('filesize'),
    S = require('string'),
    shellquote = require('shell-quote').quote,
    winston = require('winston');

/**
 * Blah fasel
 *
 * @class guerrero.collector.util.CurlFtp
 * @constructor
 * @param {Object} options
 * @cfg {string} [host="localhost"] The host to connect to.
 * @cfg {number} [port=21] The port of the remove server.
 * @cfg {string} [user="anonymous"] The name of the user.
 * @cfg {string} [password="guest"] The password.
 */
function Curl(options) {
    this.opts = _.defaults(options || {}, {
        host: 'localhost',
        port: 21,
        user: 'anonymous',
        password: 'guest'
    });
}

/**
 * Downloads part of a file.
 *
 * @param {string} file The full path of the file to download.
 * @param {number} size The minimum size of the chunk to download.
 * @param {Function} callback
 * @param {?Object} callback.err The error object.
 * @param {Buffer} callback.res The raw data.
 */
Curl.prototype.downloadFileChunk = function (file, size, callback) {
    var path = util.format(
            'ftp://%s:%s%s',
            this.opts.host, this.opts.port, S(file).ensureLeft('/').s
        ),
        args = [
            '--no-epsv', '--silent', '--speed-time 1',
            '--user ' + shellquote([this.opts.user + ':' + this.opts.password]),
            '--range 0-' + (size - 1)
        ];

    var cmd = util.format('curl %s %s', args.join(' '), shellquote([path])),
        options = {
            maxBuffer: size,
            encoding: 'binary'
        };

    // TODO: don't show the password
    winston.silly('executing "%s"', cmd);
    childprocess.exec(cmd, options, function (err, stdout, stderr) {
        if (err) {
            winston.error('command failed: %s', err.toString());
            winston.debug('stderr output was: "%s"', stderr.toString());
            callback(err);
        } else {
            winston.silly(
                'download of "%s" complete (%s read)',
                path, filesize(stdout.length, 1, false)
            );
            callback(null, new Buffer(stdout, 'binary'));
        }
    });
};

/**
 * @ignore
 */
module.exports = Curl;
