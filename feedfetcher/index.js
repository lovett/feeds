var world = require('../world');
var logger = world.logger.child({source: 'feedfetcher'});
var dispatcher = new world.events.EventEmitter();

/**
 * Fetch a feed via YQL feednormalizer
 * --------------------------------------------------------------------
 * This is an EventEmitter callback.
 *
 * http://www.yqlblog.net/blog/2013/03/07/yql-feednormalizer-table/
 */
dispatcher.on('fetch', function (feedId, feedUrl) {
    var self, parsed_url, options;

    self = this;
    parsed_url = world.url.parse(feedUrl);

    logger.info({feedId: feedId, feedUrl: feedUrl}, 'fetching feed');

    options = {
        json: true,
        url: world.url.format({
            'protocol': 'http:',
            'host': 'query.yahooapis.com',
            'pathname': '/v1/public/yql',
            'query': {
                'q': world.util.format('SELECT * FROM feednormalizer WHERE output="atom_1.0" AND url="%s"', feedUrl),
                'format': 'json'
            }
        })
    };
    
    world.request(options, function (err, response, body) {
        var map, processEvent;
        
        if (err) {
            world.logger.error(erro);
            self.emit('fetched');
            return;
        }

        if (response.statusCode !== 200) {
            logger.error({feedId: feedId, feedUrl: feedUrl, statusCode: response.statusCode}, 'yql request failed');
            self.emit('fetched');
            return;
        }

        map = {
            'reddit.com': 'reddit',
            'news.ycombinator.com': 'hn',
            'slashdot.org': 'slashdot'
        }

        processEvent = 'processEntry';
        Object.keys(map).some(function (key) {
            if (parsed_url.host.indexOf(key) == -1) {
                return false;
            }
            processEvent += ':' + map[key];
            return true;
        });

        body.query.results.feed.entry.forEach(function (entry) {
            self.emit(processEvent, feedId, entry);
        });

        self.emit('fetched', feedId);
    });
});

/**
 * Dequeue a feed following a fetch and request rescheduling
 * --------------------------------------------------------------------
 * This is an EventEmitter callback.
 */
dispatcher.on('fetched', function (feedId) {
    world.redisClient.zrem(world.keys.feedQueueKey, feedId, function (err, result) {
        logger.trace({feedId: feedId}, 'dequeued');
        world.redisClient.publish('feed:reschedule', feedId);
    });
});

/**
 * Process a feed entry
 * --------------------------------------------------------------------
 *
 * This is the general-purpose processor. Certain feeds have custom
 * processors.
 */
dispatcher.on('processEntry', function (feedId, entry) {
    var fields, date;

    fields = {};

    // title
    if (typeof entry.title === 'string') {
        fields.title = entry.title;
    } else if (entry.title instanceof Object) {
        fields.title = entry.title.content;
    }

    // url
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

    // date
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

    this.emit('storeEntry', feedId, fields);
});

/**
 * Entry processor for Slashdot
 * --------------------------------------------------------------------
 */
dispatcher.on('processEntry:slashdot', function (feedId, entry) {
    var fields = {
        url: entry.link.href,
        title: entry.title.replace(/<\/?.*?>/g, ''),
        date: world.moment(entry.updated).format('X') * 1000
    };
    
    this.emit('storeEntry', feedId, fields);
});

/**
 * Entry processor for Hacker News
 * --------------------------------------------------------------------
 */
dispatcher.on('processEntry:hn', function (feedId, entry) {
    var fields = {
        url: entry.link.href,
        title: entry.title
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

        this.emit('storeEntry', feedId, fields);
    };

    var handler = new world.htmlparser.DefaultHandler(callback.bind(this));
    var parser = new world.htmlparser.Parser(handler);
    parser.parseComplete(entry.summary.content);
    
});

/**
 * Entry processor for Reddit
 * --------------------------------------------------------------------
 */
dispatcher.on('processEntry:reddit', function (feedId, entry) {
    var fields = {
        reddit_comments: 0,
        reddit_link: entry.link.href,
        title: entry.title,
        date: world.moment(entry.date).format('X') * 1000
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

        this.emit('storeEntry', feedId, fields);
    };

    var handler = new world.htmlparser.DefaultHandler(callback.bind(this));
    var parser = new world.htmlparser.Parser(handler);
    parser.parseComplete(entry.summary.content);
});

/**
 * Store an entry after it has been processed
 * --------------------------------------------------------------------
 */
dispatcher.on('storeEntry', function (feedId, entry) {
    
    var entryId = world.hash(entry.url);

    var entryKey = world.keys.entryKey(entryId);

    world.redisClient.hget(entryKey, 'added', function (err, added) {
        var multi = world.redisClient.multi();
        var isNew = false;
        
        if (!added) {
            // The entry is new
            entry.added = new Date().getTime()
            isNew = true;
        } else {
            entry.added = added;
            isNew = false;
        }

        // Save the entry, whether new or not
        multi.hmset(entryKey, entry);

        if (isNew) {
            // Associate the entry with a feed
            multi.zadd(world.keys.feedEntriesKey(feedId), entry.added, entryId);

            // Mark the entry as unread
            // (for now, fake the user id)
            multi.lpush(world.keys.unreadKey(1), entryId);
        }

        multi.exec(function (err, result) {
            if (err) logger.error(err);

            if (isNew) {
                logger.trace({feedId: feedId, entry: entryId}, 'saved new entry');
            } else {
                logger.trace({feedId: feedId, entry: entryId}, 'updated entry');
            }
        });

        return;
    });
});


/**
 * Fetch and the entries from a feed and trigger entry processing
 * --------------------------------------------------------------------
 *
 * This script consumes the feed queue, which is a Redis sorted set
 * scored by timestamp. It runs on a timeout rather than pubsub.
 *
 * Once fetched, the feed is taken off the queue. The scheduler will
 * put it back on with a new timestamp.
 */

var runInterval = 30 * 1000; // 30 seconds

var main = function () {
    var now = new Date().getTime();

    // Number of feeds to process per run
    var batchSize = 1;
    
    world.redisClient.zrangebyscore([world.keys.feedQueueKey, '-inf', now, 'LIMIT', 0, batchSize], function (err, feedIds) {
        if (err) {
            logger.error(err);
            return;
        }

        if (feedIds.length == 0) return;

        feedIds.forEach(function (feedId) {
            world.redisClient.hget(world.keys.feedKey(feedId), 'url', function (err, url) {
                if (err) {
                    logger.error(err);
                    return;
                }

                // A feed without a url; this shouldn't happen
                if (!url) {
                    logger.warn({feedId: feedId}, 'url missing');
                    return;
                }
                
                logger.info({feedId: feedId, feedUrl: url}, 'starting fetch');

                dispatcher.emit('fetch', feedId, url);                
            });
        });
    });
    
    setTimeout(main, runInterval);
};

main();
