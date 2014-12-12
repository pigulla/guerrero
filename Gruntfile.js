module.exports = function (grunt) {
    require('load-grunt-config')(grunt, {
        data: {
            SOURCE: 'src/**/*.js',
            TESTS: 'test/**/*.js',
            TEST_SPECS: 'test/specs/**/*.test.js'
        },
        loadGruntTasks: {
            pattern: ['grunt-*'],
            config: require('./package.json'),
            scope: 'devDependencies'
        }
    });
};
