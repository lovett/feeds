var world = require('./world');

var dispatcher = new world.events.EventEmitter();

dispatcher.on('_message', function (world, message) {
    world.console.log(message);
});

// http://www.yqlblog.net/blog/2013/03/07/yql-feednormalizer-table/
dispatcher.on('_request', function (world, url) {
    var self, parsed_url, options;

    self = this;
    parsed_url = world.url.parse(url);

    world.logger.info(world.util.format('Requesting entries for %s from yql', url));

    options = {
        json: true,
        url: world.url.format({
            'protocol': 'http:',
            'host': 'query.yahooapis.com',
            'pathname': '/v1/public/yql',
            'query': {
                'q': world.util.format('SELECT * FROM feednormalizer WHERE output="atom_1.0" AND url="%s"', url),
                'format': 'json'
            }
        })
    };
    
    world.request(options, function (err, response, body) {
        var map, event;
        
        if (err) {
            world.logger.error(erro);
            return;
        }

        if (response.statusCode !== 200) {
            world.logger.error(world.util.format('Got a %s while requesting entries for %s from yql', response.statusCode, feed));
            return;
        }

        map = {
            'reddit.com': 'reddit',
            'news.ycombinator.com': 'hn',
            'slashdot.org': 'slashdot'
        }

        event = '_extract';
        Object.keys(map).forEach(function (key) {
            if (parsed_url.host.indexOf(key) > -1) {
                event += ':' + map[key];
            }
        });

        body.query.results.feed.entry.forEach(function (entry) {
            self.emit(event, world, entry);
        });
    });
});

dispatcher.on('_extract', function (world, entry) {
    var fields, date;

    fields = {};
    fields.added = +new Date();

    if (typeof entry.title === 'string') {
        fields.title = entry.title;
    } else if (entry.title instanceof Object) {
        fields.title = entry.title.content;
    }

    fields.url = entry.link.href;
    if (entry.link instanceof Array) {
        entry.link.forEach(function (element) {
            if (element.hasOwnProperty('rel') && element.rel == 'alternate') {
                fields.url = element.href;
                return element.href;
            };
        });
    }
        
    if (entry.origLink) {
        fields.url = entry.origLink.content
    }

    if (entry.updated) {
        date = entry.updated;
    } else if (entry.published) {
        date = entry.published;
    } else if (entry.date) {
        date = entry.date;
    }

    if (date) {
        fields.date = world.moment(date).format('X') * 1000;
    }

    this.emit('_store:entry', world, fields);
});

dispatcher.on('_extract:slashdot', function (world, entry) {
    var fields = {
        url: entry.link.href,
        title: entry.title.replace(/<\/?.*?>/g, ''),
        date: world.moment(entry.updated).format('X') * 1000,
        added: +new Date()
    };
    
    this.emit('_store:entry', world, fields);
});

dispatcher.on('_extract:hn', function (world, entry) {
    var fields = {
        url: entry.link.href,
        hn_title: entry.title,
        found: +new Date()
    };
    
    var callback = function (error, dom) {
        dom.forEach(function (node) {
            if (node.type !== 'tag') return;

            if (node.name !== 'a') return;

            node.children.forEach(function (child) {
                if (child.data == 'Comments') {
                    fields.hn_link = node.attribs.href;
                    return;
                }
            });
        });

        this.emit('_store:entry', world, fields);
    };

    var handler = new world.htmlparser.DefaultHandler(callback.bind(this));
    var parser = new world.htmlparser.Parser(handler);
    parser.parseComplete(entry.summary.content);
    
});

dispatcher.on('_extract:reddit', function (world, entry) {
    var fields = {
        reddit_comments: 0,
        reddit_link: entry.link.href,
        reddit_title: entry.title,
        reddit_date: world.moment(entry.date).format('X') * 1000,
        found: +new Date()
    };
    
    var callback = function (error, dom) {
        dom.forEach(function (node) {
            if (node.type !== 'tag') return;

            if (node.name !== 'a') return;

            node.children.forEach(function (child) {
                if (child.data == '[link]') {
                    fields.url = node.attribs.href;
                    return;
                }

                if (child.data.indexOf('comment') > -1) {
                    fields.reddit_comments = child.data.replace(/[^0-9]/g, '');
                    if (fields.reddit_comments === '') fields.reddit_comments = 0;
                    return;
                }
            });
        });

        this.emit('_store:entry', world, fields);
    };

    var handler = new world.htmlparser.DefaultHandler(callback.bind(this));
    var parser = new world.htmlparser.Parser(handler);
    parser.parseComplete(entry.summary.content);
});

dispatcher.on('_store:entry', function (world, entry) {

    world.client.hget('entries', entry.url, function (err, result) {
        if (result !== null) {
            world.client.hmset('entry:' + result, entry);
            world.logger.info(world.util.format('Updated entry for %s', entry.url));
        } else {
            world.client.incr('entries:counter', function (err, result) {
                world.client.hset('entries', entry.url, result);
                world.client.zadd('entries:queued', +new Date(), result);
                world.client.hmset('entry:' + result, entry);
                world.logger.info(world.util.format('Stored entry for %s', entry.url));
            });
        }
    });

});

dispatcher.on('_schedule', function (args, world, interval) {
    var url = args.pop();
    var self = this;

    var calculate_interval = function (value) {
        value = Math.abs(parseInt(value), 10);
        
        if (interval == 'on') {
            return value;
        } else if (interval == 'off') {
            return 0 - value;
        } else {
            return interval;
        }
    }

    if (!url) {
        this.emit('_message', world, 'URL not specififed');
        world.client.unref();
    }

    world.client.hget('feeds', url, function (err, feed_id) {
        if (feed_id === null) {
            self.emit('_message', world, 'You are not subscribed to that URL');
            world.client.unref();
        } else {
            world.client.hget('feeds:schedule', feed_id, function (err, feed_schedule) {
                world.client.hset('feeds:schedule', feed_id, calculate_interval(feed_schedule));
                self.emit('_message', world, 'Schedule updated');
                world.client.unref();
            });
        }
        
    });
});

dispatcher.on('pause', function (args, world) {
    this.emit('_schedule', args, world, 'off');
});

dispatcher.on('unpause', function (args, world) {
    this.emit('_schedule', args, world, 'on');
});

dispatcher.on('fetch', function (args, world) {
    var callback;

    callback = function (err, result) {
        Object.keys(result).forEach(function (feed) {
            this.emit('_request', world, feed);
        }, this);
    };

    world.client.unref();
    world.client.hgetall('feeds', callback.bind(this));
});

process.on('exit', function () {
    console.log('Goodbye!');
});

if (process.argv.length == 2) {
    dispatcher.emit('_message', world, 'Command not specified.');
}

// private events should not be callable
if (process.argv[2][0] == '_') {
    dispatcher.emit('_message', world, 'Invalid command.');
}

if (dispatcher.listeners(process.argv[2]).length == 0) {
    dispatcher.emit('_message', world, 'Unrecognized command.');
}

world.client.on('error', function (err) {
    world.logger.error(err);
});

dispatcher.emit(process.argv[2], process.argv.slice(3), world);
