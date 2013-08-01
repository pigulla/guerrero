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
 * A collector that traverses the (local) file system.
 *
 * @class guerrero.collector.FileSystemCollector
 * @extends guerrero.collector.AbstractCollector
 * @constructor
 * @param {Object=} options
 */
var FileSystemCollector = function (options) {
    /*jshint -W106*/
    FileSystemCollector.super_.apply(this, arguments);
    /*jshint +W106*/
};

util.inherits(FileSystemCollector, AbstractCollector);


/**
 * @protected
 * @inheritdoc
 */
FileSystemCollector.prototype.list = function (directory, callback) {
    var walker = walk.walk(directory, this.opts),
        files = [],
        errors = [];

    walker.on('file', function (root, stats, next) {
        var file = path.join(root, stats.name);

        files.push({
            name: file,
            size: stats.size
        });

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
