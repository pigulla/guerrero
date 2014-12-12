var childprocess = require('child_process'),
    util = require('util');

var filesize = require('filesize'),
    _ = require('lodash'),
    shellquote = require('shell-quote').quote,
    winston = require('winston');

/**
 * A lightweight wrapper around the `smbclient` command line utility.
 *
 * @class guerrero.collector.util.SmbClient
 * @constructor
 * @param {Object} options
 * @cfg {string} service The service name, e.g. `//myserver/tvseries`. (required)
 * @cfg {string} username The username. If not provided, the guest account will be used.
 * @cfg {string} password The password. Ignored if `username` is not set.
 */
function SmbClient(options) {
    _.defaults(options, {
        service: null,
        username: null,
        password: null
    });

    this._service = options.service;
    this._username = options.username;
    this._password = options.password;
}

/**
 * Escapes a string for use as a smb remote command argument.
 *
 * @private
 * @param {string} str
 * @return {string}
 */
SmbClient.prototype._escape = function (str) {
    return (str + '').replace(/([\\"'])/g, '\$1');
};

/**
 * Downloads part of a file.
 *
 * @param {string} file The full path of the file to download.
 * @param {number} size The minimum size of the chunk to download.
 * @param {Function} callback
 * @param {?Object} callback.err The error object.
 * @param {Buffer} callback.res The raw data.
 */
SmbClient.prototype.downloadFileChunk = function (file, size, callback) {
    var path = util.format('smb:%s%s', this._service, file),
        args = ['--stdout'];

    // prepend username/password or guest options
    if (this._username) {
        args.push('--username=' + this._username);

        if (this._password) {
            args.push('--password=' + this._password);
        }
    } else {
        args.push('--guest');
    }

    var cmd = util.format(
            'smbget %s %s | head --bytes=%d',
            shellquote(args), shellquote([path]), size
        ),
        // Yes, the "binary" encoding type is deprecated. Please check out this question on SO why we use it anyway:
        // http://stackoverflow.com/questions/17563977
        options = {
            maxBuffer: size,
            encoding: 'binary'
        };

    // TODO: do not show password
    winston.silly('executing "%s"', cmd);
    childprocess.exec(cmd, options, function (err, stdout, stderr) {
        if (err) {
            winston.error('command failed', err);
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
 * Generates the command line string to execute `smbclient` with.
 *
 * @private
 * @param {string} directory The directory in which to execute the command.
 * @param {string} command The command itself.
 * @param {boolean} [hidePassword=false] If `true`, mask the password (e.g., when logging).
 * @return {Array.<string>}
 */
SmbClient.prototype._getCliArgs = function (directory, command, hidePassword) {
    var args = [this._service, '--no-pass', '--directory=' + directory, '--command=' + command];

    // optional configuration parameters
    if (this._username) {
        args.push('--user=' + this._username);
    }

    if (this._password) {
        args.splice(1, 0, hidePassword ? this._password.replace(/./g, 'X') : this._password);
    }

    return args;
};

/**
 * Executes a SMB command on the remote host and returns the output.
 *
 * @private
 * @param {string} directory
 * @param {string} command
 * @param {Function} callback
 * @param {?Object} callback.err
 * @param {string} callback.stdout
 */
SmbClient.prototype._executeRemoteCommand = function (directory, command, callback) {
    var args = this._getCliArgs(directory, command),
        logArgStr = this._getCliArgs(directory, command, true).join(' '),
        proc,
        stdout = '',
        stderr = '';

    winston.silly('executing command "smbclient %s"', logArgStr);
    proc = childprocess.spawn('smbclient', args);

    proc.stdout.on('data', function (data) {
        stdout += data;
    });

    proc.stderr.on('data', function (data) {
        stderr += data;
    });

    proc.on('close', function (code, signal) {
        if (code === 0) {
            callback(null, stdout);
        } else {
            var error = new Error('Program terminated with exit code ' + code);
            error.output = stderr;
            callback(error);
        }
    });
};

/**
 * Executes the `ls` command on the remote host.
 *
 * @param {string} directory The directory.
 * @param {Function} callback
 * @param {?Object} callback.err The error object.
 * @param {string} callback.stdout The output.
 */
SmbClient.prototype.ls = function (directory, callback) {
    this._executeRemoteCommand(directory, 'ls', callback);
};

/**
 * Executes the `du` command for a specific file on the remote host.
 *
 * @param {string} file
 * @param {Function} callback
 * @param {?Object} callback.err The error object.
 * @param {string} callback.stdout The output.
 */
SmbClient.prototype.du = function (file, callback) {
    var command = 'du "' + this._escape(file) + '"';
    this._executeRemoteCommand('/', command, callback);
};

/**
 * @ignore
 */
module.exports = SmbClient;
