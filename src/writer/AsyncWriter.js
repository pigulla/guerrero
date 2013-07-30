var util = require('util');

var _ = require('lodash'),
    async = require('async'),
    winston = require('winston');

var AbstractWriter = require('./AbstractWriter');

/**
 * A writer that dumps the data into a MySQL database.
 *
 * @class guerrero.writer.AsyncWriter
 * @extend guerrero.writer.AbstractWriter
 * @constructor
 * @param {Object=} options
 * @cfg {number} [concurrency=3] The number of tasks allowed to run concurrently.
 */
var AsyncWriter = function (options) {
    /*jshint -W106*/
    AsyncWriter.super_.apply(this, arguments);
    /*jshint +W106*/

    var opts = _.defaults(options || {}, {
        concurrency: 3
    });

    this._concurrency = opts.concurrency;
};

util.inherits(AsyncWriter, AbstractWriter);


/*jshint -W030*/
/**
 * The queue for the async tasks.
 *
 * @private
 * @property {async.queue} _queryQueue
 */
AsyncWriter.prototype._queryQueue;

/**
 * The concurrency setting for the internal async queue.
 *
 * @private
 * @property {number} _concurrency
 */
AsyncWriter.prototype._concurrency;

/**
 * The worker function for the async queue.
 *
 * @abstract
 * @method _query
 * @param {guerrero.types.FileInfo} task The task definition.
 * @param {Function} callback
 * @param {?Object} callback.err The error object.
 */
AsyncWriter.prototype._query;
/*jshint +W030*/


/**
 * @inheritdoc
 */
AsyncWriter.prototype.initialize = function (callback) {
    this._queryQueue = async.queue(this._query.bind(this), this.__concurrency);
};


/**
 * @inheritdoc
 */
AsyncWriter.prototype.info = function (fileInfo) {
    this._queryQueue.push(fileInfo);
};


/**
 * Cleanup
 *
 * @template
 * @protected
 * @param {Function} callback
 * @param {?Object} callback.err The error object.
 */
AsyncWriter.prototype.beforeFinalize = function (callback) {
    callback();
};


/**
 * @inheritdoc
 */
AsyncWriter.prototype.finalize = function (callback) {
    var self = this;

    this._queryQueue.drain = function () {
        self.beforeFinalize(function (err) {
            if (err) {
                winston.error(err.toString());
            }
            callback(err);
        });
    };
};


/**
 * @ignore
 */
module.exports = AsyncWriter;
