var fs = require('fs'),
    path = require('path'),
    util = require('util');

var _ = require('lodash'),
    async = require('async'),
    filesize = require('filesize'),
    mediainfo = require('mediainfo'),
    walk = require('walk'),
    winston = require('winston');

var AbstractCollector = require('./AbstractCollector.js');

/**
 * Bar!
 *
 * @class guerrero.collector.FileSystemCollector
 * @extends guerrero.collector.AbstractCollector
 * @constructor
 * @param {Object} options
 */
var FileSystemCollector = function (options) {
    /*jshint -W106*/
    FileSystemCollector.super_.apply(this, arguments);
    /*jshint +W106*/

    this._fsizeCache = {};
};

//    info.guerrero_source_size = this._fsizeCache[info.complete_name];
util.inherits(FileSystemCollector, AbstractCollector);


/**
 * @protected
 * @inheritdoc
 */
FileSystemCollector.prototype.list = function (directory, callback) {
    var self = this,
        walker = walk.walk(directory, this.opts),
        files = [],
        errors = [];

    // keep track of the file sizes so we don't have to query them again in the _postProcessMediaInfo
    this._fsizeCache = {};

    walker.on('file', function (root, stats, next) {
        var file = path.join(root, stats.name);

        if (self._accepted(file)) {
            self._fsizeCache[file] = stats.size;
            files.push(file);
        }

        next();
    });

    walker.on('errors', function (errs, stats, next) {
        errors = errors.concat(errs);
        next();
    });

    walker.on('end', function () {
        callback(null, files);
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
