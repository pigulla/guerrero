var fs = require('fs'),
    util = require('util');

var _ = require('lodash'),
    winston = require('winston');

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
    /*jshint -W106*/
    JsonFileWriter.super_.apply(this, arguments);
    /*jshint +W106*/

    _.defaults(options, {
        filename: null,
        flags: 'w',
        mode: 0666,
        encoding: 'utf8'
    });

    this._filename = options.filename;
    this._flags = options.flags;
    this._mode = options.mode;
    this._encoding = options.encoding;
};

util.inherits(JsonFileWriter, AbstractWriter);


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
    this._fstream.once('open', function (fd) {
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
    this._fstream.write(JSON.stringify(this._last, null, 4), this._encoding);
    this._fstream.end(']', this._encoding, callback);
};


/**
 * @ignore
 */
module.exports = JsonFileWriter;
