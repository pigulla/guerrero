var util = require('util');

var AbstractWriter = require('./AbstractWriter');

/**
 * A writer that dumps the data on stdout.
 *
 * @class guerrero.writer.ConsoleWriter
 * @extend guerrero.writer.AbstractWriter
 * @constructor
 * @param {Object=} options
 */
var ConsoleWriter = function (options) {
    /*jshint -W106*/
    ConsoleWriter.super_.apply(this, arguments);
    /*jshint +W106*/
};

util.inherits(ConsoleWriter, AbstractWriter);

/**
 * @inheritdoc
 */
ConsoleWriter.prototype.info = function (info) {
    console.log(info.formattedName);
};

/**
 * @ignore
 */
module.exports = ConsoleWriter;
