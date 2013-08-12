'use strict';

module.exports = function (grunt) {
    grunt.initConfig({
        clean: {
            'docs': ['docs/output']
        },

        jshint: {
            source: {
                src: ['src/**/*.js'],
                options: {
                    jshintrc: 'src/.jshintrc'
                }
            }
        },

        eslint: {
            src: {
                files: {
                    src: ['src/**/*.js']
                },
                options: {
                    config: 'eslint.json'
                }
            }
        },

        exec: {
            jsduck: {
                cwd: 'docs',
                command: 'jsduck'
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-exec');
    grunt.loadNpmTasks('eslint-grunt');

    grunt.registerTask('docs', ['clean:docs', 'exec:jsduck']);
    grunt.registerTask('lint', ['jshint'])
};
