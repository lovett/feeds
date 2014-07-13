module.exports = function(grunt) {

    require('load-grunt-tasks')(grunt);

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        env: grunt.file.readJSON("env.json"),

        CONFIG: grunt.file.readJSON('config/default.json'),

        clean: {
            preBuild: {
                src: ['dist/*']
            },
            postBuild: {
                src: ['dist/app.min.js']
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
                    }
                ]
            }
        },

        copy: {
            less: {
                expand: true,
                flatten: true,
                src: 'src/less/*',
                dest: 'dist/less'
            },
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

        cssmin: {
            combine: {
                'src': ['bower_components/foundation/css/normalize.css',
                        'bower_components/foundation/css/foundation.css'],
                'dest': 'dist/css/lib.min.css'
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
                options: {
                    compress: true,
                    sourceMap: true,
                    sourceMapFilename: 'dist/css/app.min.css.map',
                    sourceMapURL: '/css/app.min.css.map'
                },
                src: 'src/less/*.less',
                dest: 'dist/css/app.min.css'
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

        'string-replace': {
            dev: {
                files: {
                    'dist/index.html': 'dist/index.html',
                    'dist/css/app.min.css.map': 'dist/css/app.min.css.map'
                },
                options: {
                    replacements: [
                        {
                            pattern: '<!-- livereload placeholder -->',
                            replacement: '<script src="//<%= env.HEADLINES_DEV_HOST %>:<%= env.HEADLINES_LIVERELOAD %>/livereload.js"></script>'
                        },
                        {
                            pattern: 'src/less',
                            replacement: '/less'
                        }
                    ]
                }
            },

            prod: {
                files: {
                    'dist/index.html': 'dist/index.html'
                },
                options: {
                    replacements: [{
                        pattern: '<!-- livereload placeholder -->',
                        replacement: ''
                    }]
                }
            }
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
                livereload: '<%= env.HEADLINES_LIVERELOAD %>',
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
    grunt.registerTask('build', ['clean:preBuild', 'uglify', 'less', 'cssmin', 'copy', 'concat', 'string-replace:dev', 'clean:postBuild']);
    grunt.registerTask('default', ['watch']);

};
