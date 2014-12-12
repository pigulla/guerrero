var path = require('path'),
    util = require('util');

var Glob = require('glob').Glob,
    mediainfo = require('mediainfo'),
    winston = require('winston');

var AbstractCollector = require('./AbstractCollector.js');

/**
 * A collector that traverses the (local) file system.
 *
 * @class guerrero.collector.FileSystemCollector
 * @extends guerrero.collector.AbstractCollector
 * @constructor
 * @param {Object=} options
 */
var FileSystemCollector = function (options) {
    FileSystemCollector.super_.apply(this, arguments);
};

util.inherits(FileSystemCollector, AbstractCollector);

/**
 * @protected
 * @inheritdoc
 */
FileSystemCollector.prototype.list = function (directory, callback) {
    var result = [],
        glob = new Glob('**/*', {
            cwd: directory,
            dot: false,
            mark: true,
            nosort: true,
            silent: true
        });

    glob.on('match', function (filename) {
        var file = path.join(directory, filename),
            stats = glob.statCache[file];

        result.push({
            name: file,
            size: stats.size
        });
    });

    glob.on('error', function (err) {
        winston.error('error processing file or directory: %s', err.toString());
    });

    glob.on('end', function () {
        callback(null, result);
    });
};

/**
 * @protected
 * @inheritdoc
 */
FileSystemCollector.prototype.loadMediaInfo = function (file, callback) {
    mediainfo(file, callback);
};

/**
 * @ignore
 */
module.exports = FileSystemCollector;
