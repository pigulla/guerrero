var util = require('util');

var _ = require('lodash'),
    async = require('async'),
    winston = require('winston');

var AbstractWriter = require('./AbstractWriter');

/**
 * The abstract superclass for asynchronous writers.
 *
 * Whenever a fileInfo is to be written, it is first converted into a task object via {@link #fileInfoToTask} method.
 * Each such task is eventually consumed and processed by the {@link #work} function. If necessary, subclasses may push
 * additional tasks onto the internal {@link #taskQueue}.
 *
 * @class guerrero.writer.AsyncWriter
 * @extend guerrero.writer.AbstractWriter
 * @abstract
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
 * Subclasses may push additional tasks onto this queue if needed.
 *
 * @protected
 * @property {async.queue} taskQueue
 */
AsyncWriter.prototype.taskQueue;

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
 * @protected
 * @method work
 * @param {Object} task The task definition.
 * @param {Function} callback
 * @param {?Object} callback.err The error object.
 */
AsyncWriter.prototype.work;
/*jshint +W030*/


/**
 * @inheritdoc
 */
AsyncWriter.prototype.initialize = function (callback) {
    this.taskQueue = async.queue(this.work.bind(this), this.__concurrency);
};


/**
 * Converts a `fileInfo` object into its corresponding task object.
 *
 * The default implementation simply returns the `fileInfo` object itself.
 *
 * @template
 * @protected
 * @param {guerrero.types.FileInfo} fileInfo
 * @return {Object}
 */
AsyncWriter.prototype.fileInfoToTask = function (fileInfo) {
    return fileInfo;
};


/**
 * @inheritdoc
 * @localdoc Runs {@link #fileInfoToTask} and pushes the returned task object onto the queue.
 */
AsyncWriter.prototype.info = function (fileInfo) {
    this.taskQueue.push(this.fileInfoToTask(fileInfo));
};


/**
 * If any additional steps need to be performed after all tasks have been processed (e.g., disconnecting from the
 * database) should implement this method. Subclasses should not overwrite {@link #finalize},
 *
 * The default implementation simply invokes the passed callback.
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
 * @localdoc Waits for the queue to drain and then invokes the callback.
 */
AsyncWriter.prototype.finalize = function (callback) {
    var self = this;

    this.taskQueue.drain = function () {
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
