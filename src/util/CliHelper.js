var childprocess = require('child_process'),
    util = require('util');

var _ = require('lodash'),
    filesize = require('filesize'),
    shellquote = require('shell-quote'),
    winston = require('winston');

/**
 * Ignores order, does not support repeated parameters
 *
 * note: when masked may not be validly escaped anymore
 *
 * @class guerrero.util.CliHelper
 * @constructor
 * @param {Object=} options
 */
function CliHelper(options) {
    this._options = _.defaults(options || {}, {
        separator: '='
    });

    this._parameters = {};
    this._masked = {};
}

/**
 * @constant
 * @property {string} MASKED_PASSWORD
 */
// Asterisk look like a more natural placeholder, but they need to be escaped for the shell which
// looks odd in logfiles and makes testing whether the passwords is hidden more annoying.
CliHelper.MASKED_PASSWORD = '°°°°°°°°';

/* eslint-disable no-unused-expressions */
/**
 * @private
 * @property {Object.<string, (string|boolean)>} _parameters
 */
CliHelper.prototype._parameters;

/**
 * @private
 * @property {Object.<string, boolean>} _masked
 */
CliHelper.prototype._masked;
/* eslint-enable no-unused-expressions */

CliHelper.prototype.mask = function (name, mask) {
    var obj = {};

    if (arguments.length === 1) {
        if (typeof name === 'string') {
            obj[name] = true;
        } else {
            obj = arguments[0];
        }
    } else {
        obj[name] = arguments.length > 1 ? !!arguments[1] : true;
    }

    this._mask(obj);
    return this;
};

CliHelper.prototype._mask = function (masked) {
    Object.keys(masked).forEach(function (name) {
        this._masked[name] = !!masked[name];
    }, this);
};

CliHelper.prototype.set = function () {
    if (arguments.length === 2) {
        var obj = {};
        obj[arguments[0]] = arguments[1];
        this._set(obj);
    } else {
        this._set(arguments[0]);
    }

    return this;
};

CliHelper.prototype._set = function (args) {
    Object.keys(args).forEach(function (name) {
        var value = args[name];

        if (value === false) {
            delete this._parameters[name];
        } else if (typeof value === 'string' || _.isFinite(value)) {
            this._parameters[name] = value + '';
        } else {
            this._parameters[name] = true;
        }
    }, this);
};

CliHelper.prototype.toArray = function () {
    return Object.keys(this._parameters).map(function (name) {
        var value = this._parameters[name],
            hasValue = typeof value === 'string',
            isMasked = this._masked[name],
            displayValue = isMasked ? CliHelper.MASKED_PASSWORD : shellquote.quote([value]);

        return '--' + name + (hasValue ? (this._options.separator + displayValue) : '');
    }, this);
};

CliHelper.prototype.toString = function () {
    return this.toArray().join(' ');
};

/**
 * @ignore
 */
module.exports = CliHelper;
