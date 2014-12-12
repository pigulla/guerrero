var util = require('util');

var AbstractWriter = require('./AbstractWriter');

/**
 * A writer that dumps the name of the processed file on `stdout`.
 *
 * @class guerrero.writer.ConsoleWriter
 * @extend guerrero.writer.AbstractWriter
 * @constructor
 * @param {Object} options
 */
var ConsoleWriter = function (options) {
    ConsoleWriter.super_.apply(this, arguments);
};

util.inherits(ConsoleWriter, AbstractWriter);

/**
 * @inheritdoc
 */
ConsoleWriter.prototype.info = function (info) {
    // eslint: -no-console
    console.log(info.formattedName);
};

/**
 * @ignore
 */
module.exports = ConsoleWriter;
