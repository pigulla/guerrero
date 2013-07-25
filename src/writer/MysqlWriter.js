var fs = require('fs'),
    util = require('util');

var _ = require('lodash'),
    async = require('async'),
    mysql = require('mysql'),
    winston = require('winston');

var AbstractWriter = require('./AbstractWriter');

/**
 * A writer that dumps the data into a MySQL database.
 *
 * @class guerrero.writer.MysqlWriter
 * @extend guerrero.writer.AbstractWriter
 * @constructor
 * @param {Object} options
 * @cfg {boolean} [truncate=false] If `true`, the database will be emptied when the writer is initialized.
 * @cfg {Object} tables The names of the database tables.
 * @cfg {string} [tables.files="files"]
 * @cfg {string} [tables.info="info"]
 * @cfg {string} [tables.tracks="tracks"]
 * @cfg {Object.<string,*>} mysql The options object that will be passed to the MySQL client library.
 */
var MysqlWriter = function (options) {
    /*jshint -W106*/
    MysqlWriter.super_.apply(this, arguments);
    /*jshint +W106*/

    var opts = _.defaults(options || {}, {
        mysql: {},
        tables: {},
        truncate: false
    });

    this._mysqlOpts = opts.mysql;
    this._truncate = opts.truncate;
    this._queryQueue = async.queue(this._query.bind(this), 5);
    this._tables = _.defaults(opts.tables, {
        files: 'files',
        info: 'info',
        tracks: 'tracks'
    });

    this._mysqlOpts.multipleStatements = true;
};

util.inherits(MysqlWriter, AbstractWriter);


/**
 * @inheritdoc
 */
MysqlWriter.prototype.initialize = function (callback) {
    var self = this;

    var truncateQuery = [
        'SET FOREIGN_KEY_CHECKS=0',
        util.format('TRUNCATE TABLE %s', mysql.escapeId(this._tables.info)),
        util.format('TRUNCATE TABLE %s', mysql.escapeId(this._tables.tracks)),
        util.format('TRUNCATE TABLE %s', mysql.escapeId(this._tables.files)),
        'SET FOREIGN_KEY_CHECKS=1'
    ].join(';');

    this._connection = mysql.createConnection(this._mysqlOpts);
    this._connection.connect(function (err) {
        if (err) {
            winston.error(err);
            callback(err);
        } else {
            if (self._truncate) {
                self._connection.query(truncateQuery, function (err) {
                    if (err) {
                        winston.error(err);
                    }
                    callback(err);
                });
            } else {
                callback();
            }
        }
    });
};


/**
 * @inheritdoc
 */
MysqlWriter.prototype.info = function (fileInfo) {
    var stmt = util.format(
        'INSERT INTO %s SET `name`=%s, `formattedName`=%s, `size`=%s',
        mysql.escapeId(this._tables.files),
        mysql.escape(fileInfo.name), mysql.escape(fileInfo.formattedName), mysql.escape(fileInfo.size)
    );

    this._queryQueue.push({
        file: true,
        fileInfo: fileInfo,
        stmt: stmt
    });
};


/**
 * The worker function for the async queue.
 *
 * This function executes the statement defined in the `task` object. If that object happens to have a `fileId`
 * property it is assumed to have been the "top level" insert statement. In that case this function will trigger the
 * insertion of the rest of the data.
 *
 * @private
 * @param {Object} task The task definition.
 * @param {Function} callback
 * @param {?Object} callback.err The error object.
 */
MysqlWriter.prototype._query = function (task, callback) {
    var self = this;

    this._connection.query(task.stmt, function (err, res) {
        if (err) {
            winston.error('DB error: %s [%s]', err.toString(), task.stmt);
        } else {
            if (task.file) {
                self._insertInfoData(res.insertId, task.fileInfo);
                self._insertTrackData(res.insertId, task.fileInfo);
            }
        }

        callback(err);
    });
};


/**
 * Inserts the info data into the database.
 *
 * @private
 * @param {number} fileId The id of the corresponding file entry in the `files` table.
 * @param {guerrero.types.FileInfo} fileInfo The info object.
 */
MysqlWriter.prototype._insertInfoData = function (fileId, fileInfo) {
    _.each(fileInfo.info, function (v, k) {
        if (k === 'tracks') {
            return;
        }

        if (v.length > 255) {
            winston.warn('value too long for key "%s" for file "%s"', k, fileInfo.formattedName);
        }

        var stmt = util.format(
            'INSERT INTO %s SET `file_id`=%d, `key`=%s, `value`=%s',
            mysql.escapeId(this._tables.info),
            fileId, mysql.escape(k), mysql.escape(v)
        );

        this._queryQueue.push({
            fileInfo: fileInfo,
            stmt: stmt
        });
    }, this);
};


/**
 * Inserts the track data into the database.
 *
 * @private
 * @param {number} fileId The id of the corresponding file entry in the `files` table.
 * @param {guerrero.types.FileInfo} fileInfo The info object.
 */
MysqlWriter.prototype._insertTrackData = function (fileId, fileInfo) {
    fileInfo.info.tracks.forEach(function (track) {
        if (!track.hasOwnProperty('id')) {
            return;
        }

        _.each(track, function (v, k) {
            if (k === 'id') {
                return;
            }

            if (v.length > 255) {
                winston.warn('value too long for key "%s" for file "%s"', k, fileInfo.formattedName);
            }

            var stmt = util.format(
                'INSERT INTO %s SET `file_id`=%d, `track_id`=%d, `key`=%s, `value`=%s',
                mysql.escapeId(this._tables.tracks),
                fileId, track.id, mysql.escape(k), mysql.escape(v)
            );

            this._queryQueue.push({
                fileInfo: fileInfo,
                stmt: stmt
            });
        }, this);
    }, this);
};


/**
 * @inheritdoc
 */
MysqlWriter.prototype.finalize = function (callback) {
    var self = this;

    this._queryQueue.drain = function () {
        self._connection.end(function (err) {
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
module.exports = MysqlWriter;
