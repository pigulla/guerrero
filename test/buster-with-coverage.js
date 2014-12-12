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
