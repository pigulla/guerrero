global.rootRequire = function (name) {
    return require(__dirname + '/../' + name);
};

global.rootRewire = function (name) {
    return require('rewire')(__dirname + '/../' + name);
};

module.exports.guerrero = {
    rootPath: '..',
    environment: 'node',
    tests: ['test/**/*.test.js']
};
