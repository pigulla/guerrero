var util = require('util');

var AbstractWriter = require('./AbstractWriter');

/**
 * A dummy writer that doesn't actually write anything.
 *
 * @class guerrero.writer.NullWriter
 * @extend guerrero.writer.AbstractWriter
 * @constructor
 * @param {Object} options
 */
var NullWriter = function (options) {
    NullWriter.super_.apply(this, arguments);
};

util.inherits(NullWriter, AbstractWriter);

/**
 * @inheritdoc
 */
NullWriter.prototype.info = function (fileInfo) {
};

/**
 * @ignore
 */
module.exports = NullWriter;
