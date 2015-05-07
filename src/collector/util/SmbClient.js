var childprocess = require('child_process'),
    util = require('util');

var _ = require('lodash'),
    filesize = require('filesize'),
    shellquote = require('shell-quote').quote,
    winston = require('winston');

var CliHelper = require('../../util/CliHelper');

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
 * Builds the Samba command string for downloading the given file.
 *
 * @private
 * @param {string} file The full path of the file.
 * @param {number} size The minimum size of the chunk.
 * @param {boolean} [maskPassword=false] If set, replace the password with a fixed length dummy string.
 * @return {string}
 */
SmbClient.prototype._buildGetCommand = function (file, size, maskPassword) {
    var argsStr = new CliHelper().set({
            stdout: true,
            username: this._username ? this._username : false,
            password: (this._username && this._password) ? this._password : false,
            guest: !this._username
        }).mask('password', maskPassword).toString(),
        path = util.format('smb:%s%s', this._service, file);

    return util.format(
        'smbget %s %s | head --bytes=%d',
        argsStr, shellquote([path]), size
    );
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
    var cmd = this._buildGetCommand(file, size),
        logCmd = this._buildGetCommand(file, size, true),
        // Yes, the "binary" encoding type is deprecated. Please check out this question on SO why we use it anyway:
        // http://stackoverflow.com/questions/17563977
        options = {
            maxBuffer: size,
            encoding: 'binary'
        };

    winston.silly('executing "%s"', logCmd);
    childprocess.exec(cmd, options, function (err, stdout, stderr) {
        if (err) {
            winston.error('command failed', err);
            winston.debug('stderr output was: "%s"', stderr.toString());
            callback(err);
        } else {
            winston.silly(
                'download of "smb:%s%s" complete (%s read)',
                this._service, file, filesize(stdout.length, 1, false)
            );
            // TODO: why is stdout wrapped in a new buffer?
            callback(null, new Buffer(stdout, 'binary'));
        }
    }.bind(this));
};

/**
 * Generates the command line string to execute `smbclient` with for the given directory.
 *
 * @private
 * @param {string} directory The directory in which to execute the command.
 * @param {string} command The command itself.
 * @param {boolean} [maskPassword=false] If `true`, mask the password (e.g., when logging).
 * @return {Array.<string>}
 */
SmbClient.prototype._getClientArgs = function (directory, command, maskPassword) {
    var parameters = new CliHelper().set({
            'no-pass': !this._password,
            directory: directory,
            command: command,
            user: this._username ? this._username : false
        }).toArray(),
        args = [this._service].concat(parameters);

    if (this._password) {
        // The password is not a named parameter but the second argument (after the service name)
        args.splice(1, 0, maskPassword ? CliHelper.MASKED_PASSWORD : this._password);
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
    var args = this._getClientArgs(directory, command),
        logArgStr = this._getClientArgs(directory, command, true).join(' '),
        process,
        stdout = '',
        stderr = '';

    winston.silly('executing command "smbclient %s"', logArgStr);
    process = childprocess.spawn('smbclient', args);

    process.stdout.on('data', function (data) {
        stdout += data;
    });

    process.stderr.on('data', function (data) {
        stderr += data;
    });

    process.on('close', function (code, signal) {
        winston.silly('command "smbclient %s" completed %s', logArgStr, code === 0 ? 'successfully' : 'with error');

        if (code === 0) {
            callback(null, stdout);
        } else {
            var error = new Error('Program terminated with exit code ' + code);
            error.output = stderr;
            error.code = code;
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
