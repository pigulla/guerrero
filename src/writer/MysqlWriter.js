var fs = require('fs'),
    util = require('util');

var _ = require('lodash'),
    async = require('async'),
    mysql = require('mysql'),
    winston = require('winston');

var AsyncWriter = require('./AsyncWriter');

/**
 * A writer that dumps the data into a MySQL database.
 *
 * See the [`mysql`][1] documentation for more information.
 *
 * @class guerrero.writer.MysqlWriter
 * @extend guerrero.writer.AsyncWriter
 * @constructor
 * @param {Object} options
 * @cfg {boolean} [truncate=false] If `true`, the database will be emptied when the writer is initialized.
 * @cfg {Object} tables The names of the database tables.
 * @cfg {string} [tables.files="files"]
 * @cfg {string} [tables.info="info"]
 * @cfg {string} [tables.tracks="tracks"]
 * @cfg {Object.<string,*>} mysql
 * The options that will be passed to the MySQL client library. See the [documentation][2] for more information.
 *
 * [1]: https://github.com/felixge/node-mysql
 * [2]: https://github.com/felixge/node-mysql#connection-options
 */
var MysqlWriter = function (options) {
    /*jshint -W106*/
    MysqlWriter.super_.apply(this, arguments);
    /*jshint +W106*/

    _.defaults(options, {
        mysql: {},
        tables: {},
        truncate: false
    });

    this._mysqlOpts = options.mysql;
    this._truncate = options.truncate;
    this._tables = _.defaults(options.tables, {
        files: 'files',
        info: 'info',
        tracks: 'tracks'
    });

    this._mysqlOpts.multipleStatements = true;
};

util.inherits(MysqlWriter, AsyncWriter);


/*jshint -W030*/
/**
 * The MySQL client object.
 *
 * @private
 * @property {Object} _connection
 */
MysqlWriter.prototype._connection;

/**
 * The names of the database tables.
 *
 * @private
 * @property {Object.<string, string>} _tables
 */
MysqlWriter.prototype._tables;

/**
 * If `true`, the database will be emptied when the writer is initialized.
 *
 * @private
 * @property {boolean} _truncate
 */
MysqlWriter.prototype._truncate;

/**
 * The MySQL configuration object.
 *
 * @private
 * @property {Object} _mysqlOpts
 */
MysqlWriter.prototype._mysqlOpts;
/*jshint +W030*/


/**
 * @inheritdoc
 */
MysqlWriter.prototype.initialize = function (callback) {
    /*jshint -W106*/
    MysqlWriter.super_.prototype.initialize.apply(this, arguments);
    /*jshint +W106*/

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
            if (this._truncate) {
                this._connection.query(truncateQuery, function (err) {
                    if (err) {
                        winston.error(err);
                    }
                    callback(err);
                });
            } else {
                callback();
            }
        }
    }.bind(this));
};


/**
 * @protected
 * @inheritdoc
 */
MysqlWriter.prototype.fileInfoToTask = function (fileInfo) {
    var stmt = util.format(
        'INSERT INTO %s SET `name`=%s, `formattedName`=%s, `size`=%s',
        mysql.escapeId(this._tables.files),
        mysql.escape(fileInfo.name), mysql.escape(fileInfo.formattedName), mysql.escape(fileInfo.size)
    );

    return {
        file: true,
        fileInfo: fileInfo,
        stmt: stmt
    };
};


/**
 * @inheritdoc
 * @protected
 * @localdoc
 * This function executes the statement defined in the `task` object. If that object happens to have a `fileId`
 * property it is assumed to have been the "top level" insert statement. In that case this function will trigger the
 * insertion of the rest of the data.
 */
MysqlWriter.prototype.work = function (task, callback) {
    this._connection.query(task.stmt, function (err, res) {
        if (err) {
            winston.error('DB error: %s [%s]', err.toString(), task.stmt);
        } else {
            if (task.file) {
                this._insertInfoData(res.insertId, task.fileInfo);
                this._insertTrackData(res.insertId, task.fileInfo);
            }
        }

        callback(err);
    }.bind(this));
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

        this.taskQueue.push({
            fileInfo: fileInfo,
            stmt: stmt
        });
    }.bind(this));
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

            this.taskQueue.push({
                fileInfo: fileInfo,
                stmt: stmt
            });
        }.bind(this));
    }.bind(this));
};


/**
 * @inheritdoc
 * @protected
 */
MysqlWriter.prototype.beforeFinalize = function (callback) {
    this._connection.end(callback);
};


/**
 * @ignore
 */
module.exports = MysqlWriter;
