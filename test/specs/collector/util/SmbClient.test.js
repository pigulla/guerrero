var events = require('events');

var buster = require('buster'),
    rewire = require('rewire'),
    shellquote = require('shell-quote'),
    sinon = require('sinon');

var CliHelper = rootRequire('./src/util/CliHelper'),
    SmbClient = rootRewire('./src/collector/util/SmbClient'),
    WinstonMock = rootRequire('./test/helper/WinstonMock');

var assert = buster.referee.assert,
    refute = buster.referee.refute;

var PASSWORD = 'super secret',
    USERNAME = 'smbuser',
    SERVICE = '//homeserver/music',
    FILENAME = '/music/Shpongle - Around the World in a Tea Daze.flac',
    CHUNK_SIZE = 500;

buster.testCase('collector.util.SmbClient', {
    setUp: function () {
        this.winstonMock = new WinstonMock();
        this.childprocessMock = {
            exec: sinon.stub()
        };

        this.revert = SmbClient.__set__({
            childprocess: this.childprocessMock,
            winston: this.winstonMock
        });
    },

    tearDown: function () {
        this.revert();
    },

    'downloadFileChunk': {
        setUp: function () {
            this.smbClient = new SmbClient({
                service: SERVICE,
                username: USERNAME,
                password: PASSWORD
            });
        },

        successfully: function (done) {
            this.childprocessMock.exec
                .withArgs(sinon.match.string, sinon.match.object, sinon.match.func)
                .yields(null, new Buffer('stdout data'), new Buffer('stderr data'));

            this.smbClient.downloadFileChunk(FILENAME, CHUNK_SIZE, function (error, result) {
                refute(error);
                assert.called(this.winstonMock.silly);
                assert.match(this.winstonMock.silly.firstCall.args[1], '--password=');
                refute.match(this.winstonMock.silly.firstCall.args[1], PASSWORD);
                assert.equals(result.toString(), 'stdout data');
                done();
            }.bind(this));
        },

        failed: function (done) {
            var ERROR = new Error();

            this.childprocessMock.exec
                .withArgs(sinon.match.string, sinon.match.object, sinon.match.func)
                .yields(ERROR, new Buffer('stdout data'), new Buffer('stderr data'));

            this.smbClient.downloadFileChunk(FILENAME, CHUNK_SIZE, function (error, result) {
                assert.same(error, ERROR);
                assert.called(this.winstonMock.error);
                refute(result);
                done();
            }.bind(this));
        }
    },

    _buildGetCommand: {
        'authenticated user': {
            setUp: function () {
                this.smbClient = new SmbClient({
                    service: SERVICE,
                    username: USERNAME,
                    password: PASSWORD
                });
            },

            'password shown': function () {
                var cmd = this.smbClient._buildGetCommand(FILENAME, CHUNK_SIZE);

                assert.match(cmd, '--username');
                assert.match(cmd, '--password');
                assert.match(cmd, PASSWORD);
                refute.match(cmd, '--guest');
                assert.match(cmd, '--bytes=' + CHUNK_SIZE);
            },

            'password hidden': function () {
                var cmd = this.smbClient._buildGetCommand(FILENAME, CHUNK_SIZE, true);

                assert.match(cmd, '--username');
                assert.match(cmd, shellquote.quote(['--password=' + CliHelper.MASKED_PASSWORD]));
                refute.match(cmd, '--guest');
                assert.match(cmd, '--bytes=' + CHUNK_SIZE);
            }
        },
        'guest user': function () {
            var smbClient = new SmbClient({
                    service: SERVICE
                }),
                cmd = smbClient._buildGetCommand(FILENAME, CHUNK_SIZE);

            refute.match(cmd, '--username');
            refute.match(cmd, '--password');
            assert.match(cmd, '--guest');
            assert.match(cmd, '--bytes=' + CHUNK_SIZE);
        }
    },

    ls: {
        setUp: function () {
            var childprocessStub = {
                spawn: sinon.stub()
            };

            this.smbClient = new SmbClient({
                service: SERVICE,
                username: USERNAME,
                password: PASSWORD
            });

            this.smbClientProcess = new events.EventEmitter();
            this.smbClientProcess.stdout = new events.EventEmitter();
            this.smbClientProcess.stderr = new events.EventEmitter();
            childprocessStub.spawn.withArgs('smbclient', sinon.match.array).returns(this.smbClientProcess);

            this.revert = SmbClient.__set__('childprocess', childprocessStub);
        },

        tearDown: function () {
            this.revert();
        },

        successfully: function (done) {
            var STDOUT_DATA = 'data from stdout';

            this.smbClient.ls(FILENAME, function (error, stdout) {
                refute(error);
                assert.equals(stdout, STDOUT_DATA);
                done();
            });

            this.smbClientProcess.stdout.emit('data', STDOUT_DATA);
            this.smbClientProcess.emit('close', 0);
        },

        failed: function (done) {
            var STDOUT_DATA = 'data from stdout',
                STDERR_DATA = 'data from stderr';

            this.smbClient.ls(FILENAME, function (error, stdout) {
                assert(error);
                refute(stdout);
                assert.equals(error.code, 42);
                assert.equals(error.output, STDERR_DATA);
                done();
            });

            this.smbClientProcess.stdout.emit('data', STDOUT_DATA);
            this.smbClientProcess.stderr.emit('data', STDERR_DATA);
            this.smbClientProcess.emit('close', 42);
        }
    }
});
