module.exports = function(grunt) {

    require('load-grunt-tasks')(grunt);

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        CONFIG: grunt.file.readJSON('config/default.json'),

        clean: {
            preBuild: {
                src: ['dist/*']
            },
            postBuild: {
                src: ['dist/app.min.js', 'dist/app.css']
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
                src: ['bower_components/jquery/dist/jquery.min.map',
                      'bower_components/angular/angular.min.js.map',
                      'bower_components/angular-route/angular-route.min.js.map',
                      'bower_components/angular-resource/angular-resource.min.js.map',
                      'static/favicon.ico',
                      'bower_components/jquery/dist/jquery.js',
                      'src/*',
                      '!src/less'],
                dest: 'dist/'
            }
        },

        githooks: {
            all: {
                'pre-commit': 'jshint'
            }
        },

        jshint: {
            node: {
                options: {
                    jshintrc: '.jshintrc-node'
                },
                src: ['Gruntfile.js', 'server/index.js', 'scheduler/index.js', 'feedfetcher/index.js']
            },
            browser: {
                options: {
                    jshintrc: '.jshintrc-browser'
                },
                src: ['src/**.js']
            }
        },

        less: {
            main: {
                src: 'src/less/*.less',
                dest: 'dist/app.css'
            }
        },

        nodemon: {
            server: {
                script: 'server/index.js',
                options: {
                    watch: 'server'
                }
            },
            feedfetcher: {
                script: 'feedfetcher/index.js',
                options: {
                    watch: 'feedfetcher'
                }
            },
            scheduler: {
                script: 'scheduler/index.js',
                options: {
                    watch: 'scheduler'
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

        http: {
            onefeed: {
                options: {
                    url: 'http://localhost:<%= CONFIG.http.port %>/list/feeds',
                    method: 'POST',
                    json: {
                        subscribe: [
                            {name: 'Reddit Programming', url: 'http://www.reddit.com/r/programming/.rss'},
                        ]
                    }
                }
            },
            twofeeds: {
                options: {
                    url: 'http://localhost:<%= CONFIG.http.port %>/list/feeds',
                    method: 'POST',
                    json: {
                        subscribe: [
                            {name: 'Reddit Programming', url: 'http://www.reddit.com/r/programming/.rss'},
                            {name: 'Hacker News', url: 'https://news.ycombinator.com/rss'}
                        ]
                    }
                }
            },
            allfeeds: {
                options: {
                    url: 'http://localhost:<%= CONFIG.http.port %>/list/feeds',
                    method: 'POST',
                    json: {
                        subscribe: [
                            {name: 'Reddit Programming', url: 'http://www.reddit.com/r/programming/.rss'},
                            {name: 'Hacker News', url: 'https://news.ycombinator.com/rss'},
                            {name: 'Slashdot', url: 'http://rss.slashdot.org/Slashdot/slashdot'},
                            {name: 'NYTimes Technology', url: 'http://feeds.nytimes.com/nyt/rss/Technology'}
                        ]
                    }
                }
            },
        },

        shell: {
            'reset-redis': {
                command: 'redis-cli flushdb'
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

    // Default task(s)
    grunt.registerTask('build', ['clean:preBuild', 'uglify', 'less', 'concat', 'copy', 'clean:postBuild']);
    grunt.registerTask('default', ['watch']);

};
