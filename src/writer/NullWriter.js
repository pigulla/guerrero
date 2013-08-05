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
    /*jshint -W106*/
    AbstractWriter.super_.apply(this, arguments);
    /*jshint +W106*/
};


/**
 * @inheritdoc
 */
NullWriter.prototype.info = function (fileInfo) {
};


/**
 * @ignore
 */
module.exports = NullWriter;
