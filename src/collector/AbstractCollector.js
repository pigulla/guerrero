var events = require('events'),
    util = require('util');

var async = require('async'),
    _ = require('lodash'),
    Minimatch = require('minimatch').Minimatch,
    winston = require('winston');

var MediaInfoNormalizer = require('../util/MediaInfoNormalizer');

// @TODO: Emit events to allow progress monitoring

/**
 * The abstract base class for all collector implementations.
 *
 * A collector's `{@link #list}` method is called to retrieve a list of files. How this list is generated is up to the
 * implementation but by convention it should return all files in the specified directory and its subdirectories. The
 * file names need not necessarily correspond to real files. The subclass must, however, be able to map them back to
 * whatever they correspond to when its `{@link #loadMediaInfo}` method is invoked.
 *
 * The `AbstractCollector` takes care of filtering the returned files so subclasses don't need to. They should simply
 * return all files they find. Implementing classes must also support `{@link #list}` and `{@link #loadMediaInfo}` to
 * run in parallel.
 *
 * @class guerrero.collector.AbstractCollector
 * @abstract
 * @mixins node.events.EventEmitter
 * @constructor
 * @param {Object=} options
 * @cfg {string|Array.<string>} include
 * The "accept" minimatch expression(s). A file must satisfy at least one of them in order to be contained in the
 * overall result. If none are supplied, all files are included by default.
 * @cfg {string|Array.<string>} exclude
 * The "reject" minimatch expression(s). A file must not satisfy any of them in order to be contained in the overall
 * result.
 * @cfg {number} [concurrency=3]
 * The maximum number of operations that should be executed concurrently. This primarily concerns calls to
 * `{@link #loadMediaInfo}`. Subclasses that operate on remote hosts should also take this option into account.
 * @cfg {Object} minimatch
 * The {@link minimatch configuration} object. The `{@link minimatch#dot}` and `{@link minimatch#matchBase}` options
 * are set unless they are specifically overridden.
 * @cfg {boolean} verboseFilters
 * If `true`, produce an info-level log message for each file indicating what include/exclude pattern(s) caused the file
 * to be accepted or rejected.
 */
var AbstractCollector = function (options) {
    events.EventEmitter.call(this);

    var opts = _.defaults(options || {}, {
        verboseFilters: false,
        concurrency: 3,
        include: [],
        exclude: [],
        minimatch: {}
    });

    _.defaults(opts.minimatch, {
        dot: true,
        matchBase: true
    });

    this.concurrency = opts.concurrency;
    this._verboseFilters = opts.verboseFilters;
    this._includes = this._initMinimatch(opts.include, opts.minimatch);
    this._excludes = this._initMinimatch(opts.exclude, opts.minimatch);
    this._miNormalizer = new MediaInfoNormalizer();
};

util.inherits(AbstractCollector, events.EventEmitter);


/**
 * Fired whenever the info about a file has been collected.
 *
 * @event info
 * @param {guerrero.types.FileInfo} info
 */

/**
 * Fired whenever info about a file could not be retrieved.
 *
 * @event problem
 * @param {string} file
 * @param {string} error
 */


/*jshint -W030*/

/**
 * The maximum concurrency. See {@link #cfg-concurrency}.
 *
 * @protected
 * @readonly
 * @property {number} concurrency
 */
AbstractCollector.prototype.concurrency;

/**
 * If true, produce (many) additional log output for the filtering process.
 *
 * @private
 * @property {boolean} _verboseFilters
 */
AbstractCollector.prototype._verboseFilters;

/**
 * Array of Minimatchers. A file must satisfy at least one of them in order to be accepted for further processing.
 *
 * @private
 * @property {Array.<minimatch.Minimatch>} _includes
 */
AbstractCollector.prototype._includes;

/**
 * Array of Minimatchers. A file must not satisfy any of them in order to be accepted for further processing.
 *
 * @private
 * @property {Array.<minimatch.Minimatch>} _excludes
 */
AbstractCollector.prototype._excludes;

/**
 * The mediainfo normalizer.
 *
 * @private
 * @property {guerrero.util.MediaInfoNormalizer} _miNormalizer
 */
AbstractCollector.prototype._miNormalizer;

/**
 * The central processing method that subclasses must implement.
 *
 * When called, subclasses must collect all files in the specified directory, excluding the directories themselves.
 *
 * @abstract
 * @protected
 * @method list
 * @param {string} directory The directory to process.
 * @param {Function} callback
 * @param {?Object} callback.err The error object.
 * @param {Array.<{name:string,size:number}>} callback.files The list of files.
 */
AbstractCollector.prototype.list;

/**
 * Subclasses must implement this method and return the mediainfo.
 *
 * @abstract
 * @protected
 * @method loadMediaInfo
 * @param {string} file The name of a file as reported by {@link #list}.
 * @param {Function} callback
 * @param {?Object} callback.err
 * @param {guerrero.types.MediaInfo} callback.mediainfo
 */
AbstractCollector.prototype.loadMediaInfo;
/*jshint +W030*/


/**
 * Converts a string or array of strings to an array of Minimatch objects.
 *
 * @private
 * @param {string|Array.<string>} value
 * @param {Object} options
 * @return {Array.<minimatch.Minimatch>}
 */
AbstractCollector.prototype._initMinimatch = function (value, options) {
    var array = _.isArray(value) ? value : [value];
    return array.map(function (str) {
        return new Minimatch(str, options);
    });
};


/**
 * Formats a file (or directory) with the user-specified function. This is used to "fully qualify" remote file names.
 *
 * For instance, an collector for FTP hosts may wish to convert `"tvseries/Suits/s01e01_pilot.mkv"` to
 * `"ftp://myhost.com/tvseries/Suits/s01e01_pilot.mkv"`. The primary purpose of this is to make log messages more useful
 * in case something went wrong.
 *
 * The default implementation simply returns the name of the file.
 *
 * @template
 * @protected
 * @param {string} file The actual name of the file (or directory).
 * @return {string} The formatted name.
 */
AbstractCollector.prototype.formatFile = function (file) {
    return file;
};


/**
 * The entry point for collectors.
 *
 * @param {string} directory The base directory to traverse.
 * @param {Function} callback
 * @param {?Object} callback.err The error object.
 */
AbstractCollector.prototype.execute = function (directory, callback) {
    var self = this;

    async.waterfall([
        function (cb) {
            // Generate file list
            self.list(directory, cb);
        },
        function (files, cb) {
            // Filter files
            var filtered = files.filter(function (file) {
                return self._accepted(file.name);
            });
            cb(null, filtered);
        },
        function (files, cb) {
            // Convert into FileInfo structures
            var fileInfos = files.map(function (file) {
                return {
                    name: file.name,
                    formattedName: self.formatFile(file.name),
                    size: file.size,
                    info: null
                };
            });
            cb(null, fileInfos);
        },
        function (files, cb) {
            // Load and normalize mediainfo data
            async.eachLimit(files, self.concurrency, function (file, cb) {
                self.loadMediaInfo(file.name, function (err, data) {
                    if (err) {
                        winston.error('could not get info for file "%s" (%s)', file, err.toString());
                        self.emit('problem', file, err.toString());
                    } else {
                        file.info = self._extractMediaInfo(file.name, data);
                        self.emit('info', file);
                    }
                    cb();
                });
            }, cb);
        }
    ], function (err) {
        callback(err);
    });
};


/**
 * Normalizes the returned value returned by `mediainfo` or `null` if no info was found.
 *
 * @private
 * @param {string} fileName
 * @param {Object} data
 * @return {?guerrero.types.MediaInfo}
 */
AbstractCollector.prototype._extractMediaInfo = function (fileName, data) {
    if (data.length === 0) {
        winston.warn('no mediainfo object found for file "%s"', fileName);
        return null;
    }

    if (data.length > 1) {
        winston.warn('multiple mediainfo objects found for file "%s"', fileName);
    }

    return this._miNormalizer.normalize(data[0]);
};


/**
 * Determines which minimatcher, if any, matched the given filename.
 *
 * @private
 * @param {string} fileName The name of the file.
 * @param {Array.<minimatch.Minimatch>} patterns The patterns to check against.
 * @returns {string|boolean} Returns the pattern string that matched or `false` if `patterns` had no entries or none of
 * them matched.
 */
AbstractCollector.prototype._getFirstMatchingPattern = function (fileName, patterns) {
    for (var i = 0; i < patterns.length; ++i) {
        if (patterns[i].match(fileName)) {
            return patterns[i].pattern;
        }
    }

    return false;
};


/**
 * Checks if a filename is accepted by this instance's `{@link #_includes}` and `{@link #_excludes}` matchers.
 *
 * If `{@link #cfg-verboseFilters}` is enabled, an additional log message is generated.
 *
 * @private
 * @param {string} fileName The name of the file.
 * @return {boolean}
 */
AbstractCollector.prototype._accepted = function (fileName) {
    var excludePattern = this._getFirstMatchingPattern(fileName, this._excludes),
        includePattern = this._includes.length ? this._getFirstMatchingPattern(fileName, this._includes) : true;

    if (this._verboseFilters) {
        this._logFilterMessage(fileName, includePattern, excludePattern);
    }

    return includePattern && !excludePattern;
};


/**
 * Logs a debug message as to why a file passed the filters or not.
 *
 * @private
 * @param {string} fileName The file name.
 * @param {string|boolean|null} includedBy The pattern which actually included the file. Can either be a string (the
 * pattern that matched), `true` (no include patterns were defined so the file was included by default) or `null` (there
 * was at least one include pattern but none of them matched).
 * @param {?string} excludedBy The pattern which actually excluded the file. If `null`, there either were no exclude
 * patterns specified or none of them matched.
 */
AbstractCollector.prototype._logFilterMessage = function (fileName, includedBy, excludedBy) {
    var includeMsg,
        excludeMsg;

    if (includedBy === true) {
        includeMsg = 'included by default';
    } else if (includedBy === null) {
        includeMsg = 'not included';
    } else {
        includeMsg = 'included by pattern "' + includedBy + '"';
    }

    if (excludedBy) {
        excludeMsg = 'excluded by pattern "' + excludedBy + '"';
    } else {
        excludeMsg = 'not excluded';
    }

    winston.info('File "%s" was %s %s %s', fileName, includeMsg, excludedBy ? 'but' : 'and', excludeMsg);
};


/**
 * @ignore
 */
module.exports = AbstractCollector;
