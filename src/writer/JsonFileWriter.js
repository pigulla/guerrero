var fs = require('fs'),
    util = require('util');

var _ = require('lodash');

var AbstractWriter = require('./AbstractWriter');

/**
 * A writer that dumps the data into a JSON file.
 *
 * @class guerrero.writer.JsonFileWriter
 * @extend guerrero.writer.AbstractWriter
 * @constructor
 * @param {Object} options
 * @cfg {string} filename The name of the output file.
 * @cfg {string} [flags="w"] The flags with which the output file will be opened.
 * @cfg {string} [mode=0666] The mode with which the output file will be opened.
 * @cfg {string} [encoding="utf8"] The character encoding for the output.
 */
var JsonFileWriter = function (options) {
    JsonFileWriter.super_.apply(this, arguments);

    /* eslint-disable no-octal */
    _.defaults(options, {
        filename: null,
        flags: 'w',
        mode: 0666,
        encoding: 'utf8'
    });
    /* eslint-enable no-octal */

    this._filename = options.filename;
    this._flags = options.flags;
    this._mode = options.mode;
    this._encoding = options.encoding;
};

util.inherits(JsonFileWriter, AbstractWriter);

/* eslint-disable no-unused-expressions */
/**
 * The buffer for the most recent FileInfo object.
 *
 * This class writes to a stream, i.e. each data block is written separately. This means that when {@link #info} is
 * called we do not know whether there will be more data or not so we can't decide whether to add a comma to the output
 * or not. This problem is solved by shifting the output by one element.
 *
 * @private
 * @property {?guerrero.types.FileInfo} _last
 */
JsonFileWriter.prototype._last;

/**
 * The name of the output file.
 *
 * @private
 * @property {string} _filename
 */
JsonFileWriter.prototype._filename;

/**
 * The mode with which the output file will be opened.
 *
 * @private
 * @property {number} _mode
 */
JsonFileWriter.prototype._mode;

/**
 * The character encoding for the output.
 *
 * @private
 * @property {string} _encoding
 */
JsonFileWriter.prototype._encoding;
/* eslint-enable no-unused-expressions */

/**
 * @inheritdoc
 */
JsonFileWriter.prototype.initialize = function (callback) {
    this._fstream = fs.createWriteStream(this._filename, {
        flags: this._flags,
        mode: this._mode,
        encoding: this._encoding
    });

    this._last = null;
    this._fstream.once('open', function () {
        this._fstream.write('[', this._encoding);
        callback();
    }.bind(this));
};

/**
 * @inheritdoc
 */
JsonFileWriter.prototype.info = function (info) {
    if (this._last) {
        this._fstream.write(JSON.stringify(this._last, null, 4) + ', ', this._encoding);
    }

    this._last = info;
};

/**
 * @inheritdoc
 * @protected
 */
JsonFileWriter.prototype.finalize = function (callback) {
    if (this._last) {
        this._fstream.write(JSON.stringify(this._last, null, 4), this._encoding);
    }

    this._fstream.end(']', this._encoding, callback);
};

/**
 * @ignore
 */
module.exports = JsonFileWriter;
