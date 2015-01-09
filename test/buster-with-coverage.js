global.rootRequire = function (name) {
    return require(__dirname + '/../' + name);
};

global.rootRewire = function (name) {
    return require('rewire')(__dirname + '/../' + name);
};

module.exports.guerrero = {
    rootPath: '..',
    environment: 'node',
    sources: ['src/**/*.js'],
    tests: ['test/**/*.test.js'],
    'buster-istanbul': {
        outputDirectory: 'reports/coverage',
        format: ['lcov', 'json']
    },
    extensions: [
        require('buster-istanbul')
    ]
};
