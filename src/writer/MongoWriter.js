var fs = require('fs'),
    util = require('util');

var _ = require('lodash'),
    async = require('async'),
    MongoClient = require('mongodb').MongoClient,
    winston = require('winston');

var AsyncWriter = require('./AsyncWriter');

/**
 * A writer that dumps the data into a MongoDB.
 *
 * See the
 * [`node-mongodb-native`](https://github.com/mongodb/node-mongodb-native#documentation) documentation for more
 * information on the available {@link #cfg-mongo options}.
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
 * @cfg {Object.<string,*>} mongo
 * The options object that will be passed to the MongoDB client library.
 */
var MongoWriter = function (options) {
    /*jshint -W106*/
    MongoWriter.super_.apply(this, arguments);
    /*jshint +W106*/

    var opts = _.defaults(options || {}, {
        host: 'localhost',
        port: 27017,
        database: 'guerrero',
        truncate: false,
        mongo: {}
    });

    this._mongoOpts = opts.mongo;
    this._truncate = opts.truncate;
    this._url = util.format(
        'mongodb://%s:%d/%s',
        this._mongo.host,
        this._mongo.port,
        this._mongo.database
    );
};

util.inherits(MongoWriter, AsyncWriter);


/*jshint -W030*/
/**
 * The MongoDB client object.
 *
 * @private
 * @property {Object} _db
 */
MongoWriter.prototype._db;

/**
 * The url of the MongoDB.
 *
 * @private
 * @property {string} _url
 */
MongoWriter.prototype._url;

/**
 * If `true`, the database will be emptied when the writer is initialized.
 *
 * @private
 * @property {boolean} _truncate
 */
MongoWriter.prototype._truncate;

/**
 * The MongoDB configuration object.
 *
 * @private
 * @property {Object} _mongoOpts
 */
MongoWriter.prototype._mongoOpts;
/*jshint +W030*/


/**
 * @inheritdoc
 */
MongoWriter.prototype.initialize = function (callback) {
    /*jshint -W106*/
    MongoWriter.super_.prototype.initialize.apply(this, arguments);
    /*jshint +W106*/

    MongoClient.connect(this._url, this._mongoOpts, function(err, db) {
        if (err) {
            winston.error(err);
            callback(err);
        } else {
            this._db = db;

            if (this._truncate) {
                this._db.dropDatabase(function (err) {
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
    }.bind(this));
};


/**
 * @inheritdoc
 * @protected
 */
MongoWriter.prototype.work = function (fileInfo, callback) {
    this._db.collection(this._mongo.database).insert(fileInfo, { safe: true }, callback);
};


/**
 * @inheritdoc
 * @protected
 */
MongoWriter.prototype.beforeFinalize = function (callback) {
    this._db.close(callback);
};


/**
 * @ignore
 */
module.exports = MongoWriter;
