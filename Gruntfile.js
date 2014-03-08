module.exports = function(grunt) {

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        clean: {
            pre_build: {
                src: ['dist/*']
            },
            post_build: {
                src: ["dist/app.min.js"]
            }
        },

        concat: {
            options: {
                separator: '\n',
            },
            dist: {
                src: ['bower_components/angular/angular.min.js',
                      'bower_components/angular-route/angular-route.min.js',
                      'bower_components/angular-resource/angular-resource.min.js',
                      'bower_components/moment/min/moment.min.js',
                      'bower_components/angular-moment/angular-moment.min.js',
                      'dist/app.min.js'
                     ],
                dest: 'dist/headlines.js',
            },
        },

        copy: {
            main: {
                expand: true,
                flatten: true,
                src: ['bower_components/angular/angular.min.js.map',
                      'bower_components/angular-route/angular-route.min.js.map',
                      'bower_components/angular-resource/angular-resource.min.js.map',
                      'static/favicon.ico',
                      'src/*'],
                dest: 'dist/'
            }
        },

        nodemon: {
            dev: {
                options: {
                    file: 'index.js',
                    ignoredFiles: ['dist', 'Gruntfile.js']
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
            },

            grunt: {
                files: ['Gruntfile.js'],
                tasks: ['build']
            },
            
            js: {
                files: ['src/*.js', 'src/*.html'],
                tasks: ['uglify', 'concat', 'copy'],
            },
            
            html: {
                files: ['*.html'],
                tasks: 'copy'
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
    grunt.registerTask('build', ['clean:pre_build', 'uglify', 'concat', 'copy', 'clean:post_build']);
    grunt.registerTask('default', ['build', 'watch']);

};
