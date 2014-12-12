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
            source: {
                src: ['<%= VAR.SOURCE %>'],
                options: {
                    config: '.jscsrc'
                }
            },
            tests: {
                src: ['<%= VAR.TESTS %>'],
                options: {
                    config: '.jscsrc'
                }
            }
        },

        exec: {
            jsduck: {
                cwd: 'docs',
                command: 'jsduck'
            }
        },

        eslint: {
            source: {
                src: ['<%= VAR.SOURCE %>'],
                options: {
                    config: '.eslintrc'
                }
            },
            tests: {
                src: ['<%= VAR.TESTS %>'],
                options: {
                    config: '.eslintrc'
                }
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
