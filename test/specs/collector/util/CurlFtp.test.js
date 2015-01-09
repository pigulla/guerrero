var events = require('events');

var buster = require('buster'),
    rewire = require('rewire'),
    shellquote = require('shell-quote'),
    sinon = require('sinon');

var CliHelper = rootRequire('./src/util/CliHelper'),
    CurlFtp = rootRewire('./src/collector/util/CurlFtp');

var assert = buster.referee.assert,
    refute = buster.referee.refute;

var PASSWORD = 'super secret',
    USERNAME = 'smbuser',
    HOST = 'ftp.example.com',
    PORT = 22,
    FILENAME = '/music/Shpongle - Around the World in a Tea Daze.flac',
    CHUNK_SIZE = 500;

buster.testCase('collector.util.CurlFtp', {
    setUp: function () {
        this.childprocessMock = {
            exec: sinon.stub()
        };
        this.winstonMock = {
            silly: sinon.stub(),
            debug: sinon.stub(),
            error: sinon.stub()
        };

        this.revert = CurlFtp.__set__({
            childprocess: this.childprocessMock,
            winston: this.winstonMock
        });
    },

    tearDown: function () {
        this.revert();
    },

    'downloadFileChunk': {
        setUp: function () {
            this.curlFtp = new CurlFtp({
                host: HOST,
                port: PORT,
                user: USERNAME,
                password: PASSWORD
            });
        },

        successfully: function (done) {
            this.childprocessMock.exec
                .withArgs(sinon.match.string, sinon.match.object, sinon.match.func)
                .yields(null, new Buffer('stdout data'), new Buffer('stderr data'));

            this.curlFtp.downloadFileChunk(FILENAME, CHUNK_SIZE, function (error, result) {
                refute(error);
                assert.called(this.winstonMock.silly);
                assert.match(
                    this.winstonMock.silly.firstCall.args[1],
                    '--user ' + shellquote.quote([USERNAME + ':' + CliHelper.MASKED_PASSWORD])
                );
                assert.equals(result.toString(), 'stdout data');
                done();
            }.bind(this));
        },

        failed: function (done) {
            var ERROR = new Error();

            this.childprocessMock.exec
                .withArgs(sinon.match.string, sinon.match.object, sinon.match.func)
                .yields(ERROR, new Buffer('stdout data'), new Buffer('stderr data'));

            this.curlFtp.downloadFileChunk(FILENAME, CHUNK_SIZE, function (error, result) {
                assert.same(error, ERROR);
                assert.called(this.winstonMock.error);
                refute(result);
                done();
            }.bind(this));
        }
    }
});
