module.exports = function (grunt) {
    grunt.initConfig({
        VAR: {
            SOURCE: 'src/**/*.js',
            TESTS: 'test/**/*.js'
        },

        clean: {
            'docs': ['docs/output']
        },

        jscs: {
            options: {
                config: '.jscsrc'
            },
            source: {
                src: ['<%= VAR.SOURCE %>']
            },
            tests: {
                src: ['<%= VAR.TESTS %>']
            }
        },

        exec: {
            jsduck: {
                cwd: 'docs',
                command: 'jsduck'
            }
        },

        eslint: {
            options: {
                config: '.eslintrc'
            },
            source: {
                src: ['<%= VAR.SOURCE %>']
            },
            tests: {
                src: ['<%= VAR.TESTS %>']
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-exec');
    grunt.loadNpmTasks('grunt-eslint');
    grunt.loadNpmTasks('grunt-jscs');

    grunt.registerTask('docs', ['clean:docs', 'exec:jsduck']);
    grunt.registerTask('lint', ['eslint', 'jscs']);
};
