var events = require('events');

var _ = require('lodash'),
    buster = require('buster'),
    rewire = require('rewire'),
    sinon = require('sinon');

var CliHelper = rootRequire('./src/util/CliHelper'),
    RemoteDirectoryReader = rootRewire('./src/collector/util/RemoteDirectoryReader'),
    WinstonMock = rootRequire('./test/helper/WinstonMock');

var assert = buster.referee.assert,
    refute = buster.referee.refute;

var defaultDummyFileSystem = {
    '/': {
        files: [
            { name: 'hello.txt', size: 42 }
        ],
        directories: ['empty', 'more', 'other stuff']
    },
    '/empty/': null,
    '/more/': {
        directories: ['even more']
    },
    '/more/even more/': null,
    '/other stuff/': {
        files: [
            { name: 'how.txt', size: 42 },
            { name: 'now.txt', size: 17 },
            { name: 'brown.txt', size: 1337 },
            { name: 'cow.txt', size: 47110815 }
        ],
        directories: ['nested']
    },
    '/other stuff/nested/': {
        directories: ['deeply']
    },
    '/other stuff/nested/deeply/': {
        files: [
            { name: 'bananarama.jpg', size: 1000 }
        ]
    }
};

function getDummyFileSystemDirectoryProcessor(dummyFileSystem) {
    var fileSystem = _.clone(dummyFileSystem, true);

    // Make all paths absolute
    Object.keys(fileSystem).forEach(function (path) {
        fileSystem[path] = _.defaults(fileSystem[path] || {}, {
            files: [],
            directories: []
        });

        fileSystem[path].files.forEach(function (file) {
            file.name = path + file.name;
        });
        fileSystem[path].directories.forEach(function (directory, index) {
            fileSystem[path].directories[index] = path + directory + '/';
        });
    });

    return function (directory, callback) {
        if (fileSystem[directory]) {
            callback(null, {
                directories: fileSystem[directory].directories,
                files: fileSystem[directory].files
            });
        } else {
            callback(new Error('Directory not found'));
        }
    }
}

buster.testCase('collector.util.RemoteDirectoryReader', {
    setUp: function () {
        this.winstonMock = new WinstonMock();

        this.revert = RemoteDirectoryReader.__set__({
            winston: this.winstonMock
        });
    },

    tearDown: function () {
        this.revert();
    },

    'run': {
        successfully: function (done) {
            new RemoteDirectoryReader({
                process: getDummyFileSystemDirectoryProcessor(defaultDummyFileSystem)
            }).run('/', function (error, result) {
                assert.equals([
                    { name: '/hello.txt', size: 42 },
                    { name: '/other stuff/how.txt', size: 42 },
                    { name: '/other stuff/now.txt', size: 17 },
                    { name: '/other stuff/brown.txt', size: 1337 },
                    { name: '/other stuff/cow.txt', size: 47110815 },
                    { name: '/other stuff/nested/deeply/bananarama.jpg', size: 1000 }
                ], result);

                refute.called(this.winstonMock.error);

                done();
            }.bind(this));
        },

        'already running': function (done) {
            var blocked = true,
                processFn = getDummyFileSystemDirectoryProcessor(defaultDummyFileSystem);

            function periodicProcess() {
                if (!blocked) {
                    processFn.apply(null, arguments);
                } else {
                    setTimeout(periodicProcess, 10);
                }
            }

            new RemoteDirectoryReader({
                process: periodicProcess
            }).run('/', function (error, result) {
                refute(error);
                done();
            });

            new RemoteDirectoryReader({
                process: getDummyFileSystemDirectoryProcessor(defaultDummyFileSystem)
            }).run('/', function (error, result) {
                assert(error);
                blocked = false;
            });
        },

        formats: function (done) {
            function format(filename) {
                return '[' + filename + ']';
            }

            new RemoteDirectoryReader({
                process: getDummyFileSystemDirectoryProcessor({
                    '/': {
                        files: [
                            { name: 'hello.mkv', size: 4711 }
                        ]
                    }
                }),
                format: format
            }).run('/', function (error, result) {
                assert.calledWith(
                    this.winstonMock.silly,
                    'formatted alias of "%s" is "%s"', '/', '[/]'
                );

                done();
            }.bind(this));
        }
    }
});
