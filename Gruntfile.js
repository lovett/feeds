module.exports = function(grunt) {

    require('load-grunt-tasks')(grunt);

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        env: grunt.file.readJSON('env.json'),

        clean: {
            preBuild: {
                src: ['static/*']
            },
            postBuild: {
                src: ['static/app.min.js']
            }
        },

        concat: {
            options: {
                separator: '\n',
            },
            app: {
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
                              'bower_components/FileSaver/FileSaver.js',
                              'static/app.min.js'
                             ],
                        dest: 'static/headlines.js',
                    }
                ]
            }
        },

        copy: {
            less: {
                expand: true,
                flatten: true,
                src: 'ui/less/*',
                dest: 'static/less'
            },
            main: {
                expand: true,
                flatten: true,
                src: ['bower_components/jquery/static/jquery.min.map',
                      'bower_components/angular/angular.min.js.map',
                      'bower_components/angular-route/angular-route.min.js.map',
                      'bower_components/angular-resource/angular-resource.min.js.map',
                      'ui/images/favicon.ico',
                      'bower_components/jquery/static/jquery.js',
                      'ui/*',
                      '!ui/less'],
                dest: 'static/'
            }
        },

        cssmin: {
            combine: {
                'src': ['bower_components/foundation/css/normalize.css',
                        'bower_components/foundation/css/foundation.css'],
                'dest': 'static/css/lib.min.css'
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
                src: ['ui/**.js']
            }
        },

        less: {
            main: {
                options: {
                    compress: true,
                    sourceMap: true,
                    sourceMapFilename: 'static/css/app.min.css.map',
                    sourceMapURL: '/css/app.min.css.map'
                },
                src: 'ui/less/*.less',
                dest: 'static/css/app.min.css'
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
                    'static/index.html': 'static/index.html',
                    'static/css/app.min.css.map': 'static/css/app.min.css.map'
                },
                options: {
                    replacements: [
                        {
                            pattern: '<!-- livereload placeholder -->',
                            replacement: '<script src="//<%= env.HEADLINES_DEV_HOST %>:<%= env.HEADLINES_LIVERELOAD %>/livereload.js"></script>'
                        },
                        {
                            pattern: 'ui/less',
                            replacement: '/less'
                        }
                    ]
                }
            },

            prod: {
                files: {
                    'static/index.html': 'static/index.html'
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
                    sourceMap: 'static/app.min.js.map'
                },
                files: {
                    'static/app.min.js': ['ui/app.js', 'ui/controllers.js', 'ui/services.js']
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
                files: ['ui/less/*.less', 'ui/*.js', 'ui/*.html'],
                tasks: ['build']
            }
        },

    });


    // Default task(s)
    grunt.registerTask('build', ['clean:preBuild', 'uglify', 'less', 'cssmin', 'copy', 'concat', 'string-replace:dev', 'clean:postBuild']);
    grunt.registerTask('default', ['githooks', 'build', 'watch']);

};
