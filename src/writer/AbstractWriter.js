var _ = require('lodash');


/**
 * The abstract base class for all writer implementations.
 *
 * @class guerrero.writer.AbstractWriter
 * @abstract
 * @constructor
 * @param {Object} options
 * @cfg {guerrero.collector.AbstractCollector} collector The underlying collector (required).
 */
var AbstractWriter = function (options) {
    this._collector = options.collector;
    this._collector.on('info', this.info.bind(this));
};


/*jshint -W030*/
/**
 * The collector for this writer.
 *
 * @private
 * @readonly
 * @property {guerrero.collector.AbstractCollector} collector
 */
AbstractWriter.prototype._collector;
/*jshint -W030*/


/**
 * Initialize the writer (e.g., connect to the database, open the output file, etc).
 *
 * @template
 * @param {Function} callback The done callback.
 * @param {?Object} callback.err The error object.
 */
AbstractWriter.prototype.initialize = function (callback) {
    callback();
};


/**
 * Finalize the writer (e.g., disconnect from the database, close the output file, etc).
 *
 * @template
 * @param {Function} callback The done callback.
 * @param {?Object} callback.err The error object.
 */
AbstractWriter.prototype.finalize = function (callback) {
    callback();
};


/*jshint -W030*/
/**
 * Signals the writer that a file has been processed.
 *
 * @abstract
 * @method info
 * @param {guerrero.types.FileInfo} fileInfo The info object.
 */
AbstractWriter.prototype.info;
/*jshint +W030*/


/**
 * @ignore
 */
module.exports = AbstractWriter;
