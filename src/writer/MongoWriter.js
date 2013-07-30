var fs = require('fs'),
    util = require('util');

var _ = require('lodash'),
    async = require('async'),
    MongoClient = require('mongodb').MongoClient,
    winston = require('winston');

var AsyncWriter = require('./AsyncWriter');

/**
 * A writer that dumps the data into a MySQL database.
 *
 * @class guerrero.writer.MongoWriter
 * @extend guerrero.writer.AsyncWriter
 * @constructor
 * @param {Object} options
 * @cfg {boolean} [truncate=false] If `true`, the database will be emptied when the writer is initialized.
 * @cfg {Object} tables The names of the database tables.
 * @cfg {string} [tables.files="files"]
 * @cfg {string} [tables.info="info"]
 * @cfg {string} [tables.tracks="tracks"]
 * @cfg {Object.<string,*>} mysql The options object that will be passed to the MySQL client library.
 */
var MongoWriter = function (options) {
    /*jshint -W106*/
    MongoWriter.super_.apply(this, arguments);
    /*jshint +W106*/

    var opts = _.defaults(options || {}, {
        mongo: {},
        truncate: false
    });

    _.defaults(opts.mongo, {
        host: 'localhost',
        port: 27017,
        database: 'guerrero'
    });

    this._mongo = opts.mongo;
    this._truncate = opts.truncate;
    this._db = null;
};

util.inherits(MongoWriter, AsyncWriter);


/*jshint -W030*/
/**
 * The mongodb db object.
 *
 * @private
 * @property {Object} _db
 */
MongoWriter.prototype._db;
/*jshint +W030*/


/**
 * @inheritdoc
 */
MongoWriter.prototype.initialize = function (callback) {
    /*jshint -W106*/
    MongoWriter.super_.prototype.initialize.apply(this, arguments);
    /*jshint +W106*/

    var self = this,
        url = util.format(
            'mongodb://%s:%d/%s',
            this._mongo.host,
            this._mongo.port,
            this._mongo.database
        );

    MongoClient.connect(url, function(err, db) {
        if (err) {
            winston.error(err);
            callback(err);
        } else {
            self._db = db;

            if (self._truncate) {
                self._db.dropDatabase(function (err) {
                    if (err) {
                        winston.error(err.toString());
                        callback(err);
                    } else {
                        callback();
                    }
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
MongoWriter.prototype._query = function (fileInfo, callback) {
    this._db.collection(this._mongo.database).insert(fileInfo, { safe: true }, callback);
};


/**
 * @inheritdoc
 */
MongoWriter.prototype.beforeFinalize = function (callback) {
    this._db.close(callback);
};


/**
 * @ignore
 */
module.exports = MongoWriter;
