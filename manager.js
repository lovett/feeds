var world = require('./world');

var dispatcher = new world.events.EventEmitter();

dispatcher.on('_message', function (world, message) {
    world.console.log(message);
});

// http://www.yqlblog.net/blog/2013/03/07/yql-feednormalizer-table/
dispatcher.on('_request', function (world, url) {
    var self = this;
    world.logger.info(world.util.format('Requesting entries for %s from yql', url));
    
    var parsed_url = world.url.parse(url);

    var request_options = {
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

    world.request(request_options, function (err, response, body) {
        var feed_store_event, entry_store_event;
        
        if (err) {
            world.logger.error(error);
        }

        if (response.statusCode !== 200) {
            world.logger.error(world.util.format('Got a %s while requesting entries for %s from yql', response.statusCode, feed));
        }

        if (parsed_url.host.indexOf('reddit.com') > -1) {
            feed_store_event = '_store:feed:reddit';
            entry_store_event = '_extract:reddit';
        } else {
            feed_store_event = '_store:feed';
            entry_store_event = '_extract';
        }
        
        self.emit(feed_store_event, world, url, body.query.results.feed);
        
        body.query.results.feed.entry.forEach(function (entry) {
            self.emit(entry_store_event, world, entry);
        });
    });
});

dispatcher.on('_extract:reddit', function (world, entry) {
    var fields = {
        reddit_link: entry.link.href,
        reddit_title: entry.title,
        reddit_date: entry.date
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

dispatcher.on('_store:feed:reddit', function (world, url, feed) {
    var fields = {
        title: feed.title,
        subtitle: feed.subtitle,
        found: +new Date()
    }

    fields.site_url = feed.link.reduce(function (link) {
        if (link.rel === 'alternate') {
            return link.href;
        }
    });

    world.client.hget('feeds', url, function (err, result) {
        var key = 'feed:' + result;
        if (result !== null) {
            world.client.hmset(key, fields);
            world.logger.info(world.util.format('Updated feed details for %s', key));
        };
    });
    
});

dispatcher.on('_store:entry', function (world, entry) {

    world.client.hget('entries', entry.url, function (err, result) {
        if (result !== null) {
            world.client.hmset('entry:' + result, entry);
            world.logger.info(world.util.format('Updated entry for %s', entry.url));
        } else {
            world.client.incr('entries:counter', function (err, result) {
                world.client.hset('entries', entry.url, result);
                world.client.rpush('entries:queued', result);
                world.client.hmset('entry:' + result, entry);
                world.logger.info(world.util.format('Stored entry for %s', entry.url));
            });
        }
    });

});

dispatcher.on('subscribe', function (args, world) {
    var url = args.pop();
    var self = this;

    if (!url) {
        this.emit('_message', world, 'URL not specified');
        world.client.unref();
    }

    world.client.hexists('feeds', url, function (err, result) {
        if (result !== 0) {
            self.emit('_message', world, 'You are already subscribed to that URL');
            world.client.unref();
        } else {
            world.client.incr('feeds:counter', function (err, feed_id) {
                world.client.hset('feeds', url, feed_id);
                world.client.hset('feeds:schedule', feed_id, world.config.feed_check_interval);
                self.emit('_message', world, 'Subscription added');
                self.emit('_request', world, url);
                world.client.unref();
            });
        };
    });
});

dispatcher.on('unsubscribe', function (args, world) {
    var url = args.pop();
    var key = 'feeds';
    var self = this;

    if (!url) {
        this.emit('_message', world, 'URL not specified');
        world.client.unref();
    }

    world.client.hexists(key, url, function (err, result) {
        if (result === 0) {
            self.emit('_message', world, 'You are not subscribed to that URL');
        } else {
            world.client.hdel(key, url);
            self.emit('_message', world, 'You have been unsubscribed');
            world.client.unref();
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
        // only consider active (unpaused) feeds
        var feeds = Object.keys(result).filter(function (feed) {
            return parseInt(result[feed], 10) === 1
        });

        feeds.forEach(function (feed) {
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
