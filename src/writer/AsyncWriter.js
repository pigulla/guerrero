var util = require('util');

var async = require('async'),
    _ = require('lodash'),
    winston = require('winston');

var AbstractWriter = require('./AbstractWriter');

/**
 * The abstract superclass for asynchronous writers.
 *
 * Whenever a fileInfo is to be written it is first converted into a task object via the {@link #fileInfoToTask} method.
 * Each such task is eventually consumed and processed by the {@link #work} function. If necessary, subclasses may push
 * additional tasks onto the internal {@link #taskQueue} as needed.
 *
 * @class guerrero.writer.AsyncWriter
 * @extend guerrero.writer.AbstractWriter
 * @abstract
 * @constructor
 * @param {Object} options
 * @cfg {number} [concurrency=3] The number of tasks allowed to run concurrently.
 */
var AsyncWriter = function (options) {
    AsyncWriter.super_.apply(this, arguments);

    _.defaults(options, {
        concurrency: 3
    });

    this._concurrency = options.concurrency;
};

util.inherits(AsyncWriter, AbstractWriter);

/* eslint-disable no-unused-expressions */
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
/* eslint-enable no-unused-expressions */

/**
 * @inheritdoc
 * @localdoc This implementation only sets up the {@link #taskQueue}, it does not invoke the callback. In other words,
 * subclasses *must* call this method and they *must* invoke the callback themselves.
 */
AsyncWriter.prototype.initialize = function (callback) {
    this.taskQueue = async.queue(this.work.bind(this), this._concurrency);
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
 * The difference to {@see #finalize} is that `finalize` is invoked when the last file was processed, at which point
 * there may still be items in the {@see #taskQueue}. `beforeFinalize`, on the other hand, is called when the last item
 * in the queue has been processed and the writer should perform its final cleanup.
 *
 * The default implementation simply invokes the passed callback directly.
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
 * @localdoc Waits for the queue to drain and then invokes the callback. Subclasses must *not* overwrite this method but
 * implement {@see #beforeFinalize} instead.
 */
AsyncWriter.prototype.finalize = function (callback) {
    this.taskQueue.drain = function () {
        this.beforeFinalize(function (err) {
            if (err) {
                winston.error(err.toString());
            }
            callback(err);
        });
    }.bind(this);
};

/**
 * @ignore
 */
module.exports = AsyncWriter;
