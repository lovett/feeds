module.exports = function(grunt) {

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        clean: {
            pre_build: {
                src: ['dist/*']
            },
            post_build: {
                src: ["dist/app.min.js", "dist/app.css"]
            }
        },

        concat: {
            options: {
                separator: '\n',
            },
            dist: {
                files: [
                    {
                        src: ['bower_components/jquery/dist/jquery.min.js',
                              'bower_components/foundation/js/foundation.min.js',
                              'bower_components/angular/angular.min.js',
                              'bower_components/angular-route/angular-route.min.js',
                              'bower_components/angular-resource/angular-resource.min.js',
                              'bower_components/moment/min/moment.min.js',
                              'bower_components/angular-moment/angular-moment.min.js',
                              'bower_components/lodash/dist/lodash.min.js',
                              'dist/app.min.js'
                             ],
                        dest: 'dist/headlines.js',
                    },
                    {
                        src: ['bower_components/foundation/css/normalize.css',
                              'bower_components/foundation/css/foundation.css',
                              'font/icomoon/style.css',
                              'dist/app.css'
                             ],
                        dest: 'dist/headlines.css'
                    }
                ]
            }
        },

        copy: {
            main: {
                expand: true,
                flatten: true,
                src: ['bower_components/foundation/js/vendor/modernizr.js',
                      'bower_components/jquery/dist/jquery.min.map',
                      'bower_components/angular/angular.min.js.map',
                      'bower_components/angular-route/angular-route.min.js.map',
                      'bower_components/angular-resource/angular-resource.min.js.map',
                      'static/favicon.ico',
                      'src/*',
                      '!src/less'],
                dest: 'dist/'
            },
            font: {
                expand: true,
                flatten: true,
                src: 'font/icomoon/fonts/*',
                dest: 'dist/fonts'
            }
        },

        less: {
            main: {
                src: "src/less/*.less",
                dest: "dist/app.css"
            }
        },

        nodemon: {
            server: {
                script: 'server/index.js',
                options: {
                    watch: 'server'
                }
            },
            indexer: {
                script: 'indexer/index.js',
                options: {
                    watch: 'indexer'
                }
            },
            downloader: {
                script: 'downloader/index.js',
                options: {
                    watch: 'downloader'
                }
            }
        },

        uglify: {
            js: {
                options: {
                    sourceMap: 'dist/app.min.js.map'
                },
                files: {
                    'dist/app.min.js': ['src/app.js', 'src/controllers.js', 'src/services.js']
                }
            }
        },

        watch: {
            options: {
                livereload: true,
                atBegin: true
            },

            grunt: {
                files: ['Gruntfile.js'],
                tasks: ['build']
            },

            app: {
                files: ['src/less/*.less', 'src/*.js', 'src/*.html'],
                tasks: ['build']
            }
        },

    });


    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-less');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-nodemon');

    // Default task(s)
    grunt.registerTask('build', ['clean:pre_build', 'uglify', 'less', 'concat', 'copy', 'clean:post_build']);
    grunt.registerTask('default', ['watch']);

};
