var _ = require('lodash'),
    async = require('async'),
    fkt = require('fkt'),
    winston = require('winston');


/**
 * This is a helper class for traversing remote directories.
 *
 * Users of this class must provide a `{@link #cfg-process}` method which will be invoked with the starting directory.
 * It must then query its underlying source and return all files and directories within that directory. The recursion
 * through the subdirectories is handled by the ` RemoteDirectoryReader`.
 *
 * @class guerrero.collector.util.RemoteDirectoryReader
 * @constructor
 * @param {Object} options
 * @cfg {number} concurrency The maximum number of concurrent operations on the remote host.
 * @cfg {Function} format
 * A function that formats raw file names in something more suitable for logs, e.g. by prefixing the actual file name
 * with the name of the remote host.
 * @cfg {string} format.file The original file name.
 * @cfg {Function} progress A progress callback that is invoked whenever a directory was processed.
 * @cfg {guerrero.types.ProgressStatus} progress.status The current status of the traversal.
 * @cfg {Function} process The callback that is invoked recursively with each found directory.
 * @cfg {string} process.directory The directory to process.
 * @cfg {Function} process.callback The callback that must be invoked when the passed directory is processed completely.
 * @cfg {?Object} process.callback.err The error object.
 * @cfg {Object} process.callback.result x The result file list.
 * @cfg {Array.<string>} process.callback.result.directories The list of all subdirectories that were found.
 * @cfg {Array.<string>} process.callback.result.files The list of all files within the directory that were found.
 */
var RemoteDirectoryReader = function (options) {
    this._running = false;

    _.defaults(options, {
        concurrency: 1,
        format: fkt.identity,
        progress: fkt.noop,
        process: null
    });

    this._formatFile = options.format;
    this._process = options.process;
    this._progress = options.progress;
    this._concurrency = options.concurrency;
};


/*jshint -W030*/
/**
 * The progress callback that is invoked whenever a directory was processed.
 *
 * @private
 * @property {Function} _process
 */
RemoteDirectoryReader.prototype._process;

/**
 * The maximum number of workers to run concurrently
 *
 * @private
 * @property {number} _concurrency
 */
RemoteDirectoryReader.prototype._concurrency;

/**
 * @private
 * @property {function(string):string} _formatFile
 */
RemoteDirectoryReader.prototype._formatFile;

/**
 * Indicates whether the reader is currently running.
 *
 * @private
 * @property {boolean} _running
 */
RemoteDirectoryReader.prototype._running;

/**
 * Keeps track of the number of completed tasks.
 *
 * @private
 * @property {number} _tasksDone
 */
RemoteDirectoryReader.prototype._tasksDone;

/**
 * List of all files found so far.
 *
 * @private
 * @property {Array.<{name:string,size:number}>} _fileList
 */
RemoteDirectoryReader.prototype._fileList;

/**
 * List of all errors encountered so far.
 *
 * @private
 * @property {Array.<{directory:string,message:string}>} _errors
 */
RemoteDirectoryReader.prototype._errors;

/**
 * The async.queue used for recursive processing.
 *
 * @private
 * @property {async.queue} _queue
 */
RemoteDirectoryReader.prototype._queue;
/*jshint +W030*/


/**
 * Executes the reader on the specified directory.
 *
 * Invokes the callback with a list of files found. The caller should not make any assumptions about their order. While
 * the reader is running invoking this function again will result in an error.
 *
 * @param {string} directory
 * @param {Function} callback
 * @param {?Object} callback.err
 * @param {Array.<{name:string,size:number}>} callback.files
 */
RemoteDirectoryReader.prototype.run = function (directory, callback) {
    if (this._running) {
        winston.error('instance is already running');
        callback(new Error('Reader is already running'), null);
        return;
    }

    winston.debug('initializing for directory "%s"', directory);
    winston.silly('formatted alias of "%s" is "%s"', directory, this._formatFile(directory));

    this._running = true;
    this._tasksDone = 0;
    this._fileList = [];
    this._errors = [];
    this._queue = async.queue(this._createWorker.bind(this), this._concurrency);

    this._queue.drain = (function () {
        this._notify();
        this._running = false;
        if (!this._errors.length) {
            callback(null, this._fileList);
        } else {
            var error = new Error('Errors have occurred');
            error._errors = this._errors;
            callback(error, null);
        }
    }.bind(this));

    this._enqueue(directory);
};


/**
 * Calls the notify callback with the current progress status.
 *
 * @private
 */
RemoteDirectoryReader.prototype._notify = function () {
    this._progress({
        done: this._tasksDone,
        total: this._tasksDone + this._queue.length()
    });
};


/**
 * Creates a worker for async.
 *
 * @private
 * @param {string} directory The directory to process.
 * @param {Function} callback  The done callback.
 * @param {?Object} callback.err The error object.
 */
RemoteDirectoryReader.prototype._createWorker = function (directory, callback) {
    winston.verbose('processing directory "%s"', this._formatFile(directory));

    this._processDirectory(directory, function (err) {
        this._tasksDone++;
        this._notify();

        if (err) {
            winston.error('error processing directory "%s" (%s)', this._formatFile(directory), err.toString());
            winston.debug('output was: ' + err.output);
            this._errors.push({
                directory: directory,
                message: err.toString()
            });
            callback(err);
        } else {
            winston.silly('successfully processed directory "%s"', this._formatFile(directory));
            callback();
        }
    }.bind(this));
};


/**
 * Passes the given directory to the "process" callback specified in the options. Once that callback returns, the reader
 * automatically recurses into the found subdirectories.
 *
 * @private
 * @param {string} directory The directory to process.
 * @param {Function} callback The done callback.
 * @param {?Object} callback.err The error object.
 * @param {{files:Array.<string>,directories:Array.<string>}} callback.res The result object.
 */
RemoteDirectoryReader.prototype._processDirectory = function (directory, callback) {
    winston.debug('processing directory "%s"', this._formatFile(directory));

    this._process(directory, function (err, res) {
        if (!err) {
            winston.debug(
                'found %d files in directory "%s"',
                res.files.length, this._formatFile(directory)
            );
            this._fileList.push.apply(this._fileList, res.files);
            res.directories.forEach(this._enqueue, this);
        }

        callback(err, res);
    }.bind(this));
};


/**
 * Adds the given directory to the processing queue and notifies the progress callbacks.
 *
 * @private
 * @param {string} directory The directory to enqueue.
 */
RemoteDirectoryReader.prototype._enqueue = function (directory) {
    this._queue.push(directory);
    this._notify();
};


/**
 * @ignore
 */
module.exports = RemoteDirectoryReader;
