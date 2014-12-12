module.exports = function (grunt) {
    return {
        'default': [
            'lint', 'tests-with-coverage'
        ],

        'docs': [
            'clean:docs', 'exec:jsduck'
        ],

        'lint': [
            'eslint', 'jscs'
        ],

        'tests-with-coverage': [
            'clean:coverage',
            'istanbul_check_coverage:default'
        ]
    };
};
