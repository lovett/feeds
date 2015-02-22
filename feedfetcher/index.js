/*jshint camelcase:false */
var world = require('../world');
var needle = require('needle');
var path = require('path');
var logger = world.logger.child({source: 'feedfetcher'});
var dispatcher = new world.events.EventEmitter();


dispatcher.on('prefetch', function (feedId, feedUrl, subscribers) {
    world.request({
        method: 'HEAD',
        uri: feedUrl,
        followRedirect: false
    }, function (err, response) {
        var recheckAt;
        if (err) {
            recheckAt = Date.now() + (1000 * 60 * 5); // 5 minutes from now
            logger.error({err: err}, 'feed url error from head request');
            world.redisClient.publish('feed:reschedule', feedId + '::' + recheckAt);
            return;
        }

        if (!response.headers.location) {
            dispatcher.emit('fetch', feedId, feedUrl, subscribers);
        } else {
            world.redisClient.hset(world.keys.feedKey(feedId), 'url', response.headers.location, function (err) {
                if (err) {
                    world.logger.error({err: err}, 'unable to update feed url');
                    return;
                }
                dispatcher.emit('fetch', feedId, response.headers.location, subscribers);
            });
        }
    });
});


/**
 * Fetch a feed
 * --------------------------------------------------------------------
 *
 */

dispatcher.on('fetch', function (feedId, feedUrl, subscribers) {
    var parsedFeedUrl, event;
    parsedFeedUrl = world.url.parse(feedUrl);

    if (parsedFeedUrl.host === 'www.reddit.com') {
        event = 'fetch:reddit';
    } else if (parsedFeedUrl.host.indexOf('stackexchange.com') > -1) {
        event = 'fetch:stackexchange';
    } else {
        event = 'fetch:google';
    }
    dispatcher.emit(event, feedId, feedUrl, subscribers);
});


/**
 * Fetch a StackExchange feed
 * --------------------------------------------------------------------
 */
dispatcher.on('fetch:stackexchange', function (feedId, feedUrl, subscribers) {
    var parsedUrl, endpoint;

    parsedUrl = world.url.parse(feedUrl);

    endpoint = world.url.format({
        protocol: 'https',
        host: 'api.stackexchange.com',
        pathname: '/2.2/questions',
        query: {
            'site': parsedUrl.host.split('.').shift(),
            'order': 'desc',
            'sort': 'week',
            'filter': '!)R7_Ydm)7LrqRF9BkudkXj*v' // answer_count, score, creation_date, link, title
        }
    });

    needle.get(endpoint, function (err, response) {
        if (err || response.statusCode !== 200) {
            world.logger.error({err: err, status: response.responseStatus}, 'stackexchange api request failed, will try later');
            world.redisClient.publish('feed:reschedule', feedId);
            return;
        }

        response.body.items.forEach(function (item) {
            var fields;

            fields = {
                stackComments: item.answer_count,
                url: item.link,
                title: item.title,
                date: item.creation_date
            };

            dispatcher.emit('storeEntry', feedId, fields, subscribers);

        });

        // Request rescheduling
        world.redisClient.hset(world.keys.feedKey(feedId), 'prevCheck', new Date().getTime());
        world.redisClient.publish('feed:reschedule', feedId);
        logger.trace({feedId: feedId}, 'fetch complete, reschedule requested');

    });
});


/**
 * Fetch a Reddit feed
 * --------------------------------------------------------------------
 */
dispatcher.on('fetch:reddit', function (feedId, feedUrl, subscribers) {
    var parsedUrl, jsonPath, jsonUrl;
    parsedUrl = world.url.parse(feedUrl);
    jsonPath = path.dirname(parsedUrl.path) + '/.json';

    jsonUrl = feedUrl.replace(parsedUrl.path, jsonPath);

    needle.get(jsonUrl, function (err, response) {
        if (err || response.statusCode !== 200) {
            world.logger.error({err: err, status: response.responseStatus}, 'reddit api request failed, will try later');
            world.redisClient.publish('feed:reschedule', feedId);
            return;
        }

        response.body.data.children.forEach(function (child) {
            var entry, fields;
            entry = child.data;
            fields = {
                redditComments: entry.num_comments,
                redditLink: 'https://' + parsedUrl.hostname + entry.permalink,
                title: entry.title,
                date: entry.created_utc,
                url: entry.url
            };

            dispatcher.emit('storeEntry', feedId, fields, subscribers);

        });

        // Request rescheduling
        world.redisClient.hset(world.keys.feedKey(feedId), 'prevCheck', new Date().getTime());
        world.redisClient.publish('feed:reschedule', feedId);
        logger.trace({feedId: feedId}, 'fetch complete, reschedule requested');
    });
});

/**
 * Fetch a feed via Google Feed API
 * --------------------------------------------------------------------
 * This is an EventEmitter callback.
 *
 * https://developers.google.com/feed/v1/jsondevguide
 */
dispatcher.on('fetch:google', function (feedId, feedUrl, subscribers) {
    var self, parsedUrl, endpoint, headers;

    self = this;
    parsedUrl = world.url.parse(feedUrl);

    endpoint = world.url.format({
        'protocol': 'https:',
        'host': 'ajax.googleapis.com',
        'pathname': '/ajax/services/feed/load',
        'query': {
            'v': '1.0',
            'q': feedUrl,
            'userip': process.env.HEADLINES_IP,
            'num': -1,
            'output': 'json'
        }
    });

    headers = {
        'Referer': process.env.HEADLINES_URL
    };

    logger.info({feedId: feedId, feedUrl: feedUrl, googleUrl: endpoint}, 'querying google feed api');

    needle.get(endpoint, headers, function (err, response) {
        var map, processEvent;

        if (err) {
            world.logger.error({err: err}, 'google feed api request failed, will try later');
            world.redisClient.publish('feed:reschedule', feedId);
            return;
        }

        if (response.body.responseStatus !== 200) {
            logger.error({feedId: feedId, feedUrl: feedUrl, statusCode: response.body.statusCode}, 'google feed api error, will try later');
            world.redisClient.publish('feed:reschedule', feedId);
            return;
        }

        logger.trace({feedId: feedId, feedUrl: feedUrl}, 'google feed api queried successfully');

        //var data = response.body.responseData;
        //console.log(data.error)

        map = {
            'news.ycombinator.com': 'hn',
            'slashdot.org': 'slashdot'
        };

        processEvent = 'processEntry';

        Object.keys(map).some(function (key) {
            // Test for presence of key at end of parsedUrl.host
            if (parsedUrl.host.indexOf(key, parsedUrl.host.length - key.length) === -1) {
                return false;
            }
            processEvent += ':' + map[key];
            return true;
        });

        var feed = response.body.responseData.feed;

        feed.entries.reverse().forEach(function (entry) {
            self.emit(processEvent, feedId, entry, subscribers);
            return true;
        });

        //logger.error({feedId: feedId, feedUrl: feedUrl, googleUrl: endpoint, error: e}, 'no entries found');

        world.redisClient.hset(world.keys.feedKey(feedId), 'prevCheck', new Date().getTime());

        // Request rescheduling
        world.redisClient.publish('feed:reschedule', feedId);
        logger.trace({feedId: feedId}, 'fetch complete, reschedule requested');
    });
});

/**
 * Process a feed entry
 * --------------------------------------------------------------------
 *
 * This is the general-purpose processor. Certain feeds have custom
 * processors.
 */
dispatcher.on('processEntry', function (feedId, entry, subscribers) {
    var fields;

    fields = {};

    // title
    if (typeof entry.title === 'string') {
        fields.title = entry.title;
    } else if (entry.title instanceof Object) {
        fields.title = entry.title.content;
    }

    // url
    fields.url = entry.link;

    // date
    fields.date = world.moment(new Date(entry.publishedDate)).format('X') * 1000;

    this.emit('storeEntry', feedId, fields, subscribers);
});


/**
 * Entry processor for Slashdot
 * --------------------------------------------------------------------
 */
dispatcher.on('processEntry:slashdot', function (feedId, entry, subscribers) {
    var fields = {
        url: entry.link,
        title: entry.title.replace(/<\/?.*?>/g, ''),
        date: world.moment(new Date(entry.publishedDate)).format('X') * 1000
    };

    this.emit('storeEntry', feedId, fields, subscribers);
});

/**
 * Entry processor for Hacker News
 * --------------------------------------------------------------------
 */
dispatcher.on('processEntry:hn', function (feedId, entry, subscribers) {
    var fields = {
        url: entry.link,
        title: entry.title
    };

    var callback = function (error, dom) {
        var id;
        var self = this;
        var algoliaUrl;
        dom.forEach(function (node) {
            if (node.type !== 'tag') {
                return;
            }

            if (node.name !== 'a') {
                return;
            }

            node.children.forEach(function (child) {
                if (child.data === 'Comments') {
                    fields.hnLink = node.attribs.href;
                    return;
                }
            });
        });

        if (!fields.hnLink) {
            self.emit('storeEntry', feedId, fields, subscribers);
        } else {
            id = fields.hnLink.match(/id=(\d+)/)[1];

            algoliaUrl = 'https://hn.algolia.com/api/v1/search?tags=story_' + id;
            world.request(algoliaUrl, function (err, resp, body) {
                if (err || resp.statusCode !== 200) {
                    logger.error({err: err, status: resp.statusCode}, 'algolia request failed');
                } else {
                    logger.trace({id: id, algoliaUrl: algoliaUrl}, 'queried algolia');
                    body = JSON.parse(body);
                    try {
                        fields.hnComments = body.hits[0].num_comments;
                    } catch(e) {
                        fields.hnComments = 0;
                    }
                }

                self.emit('storeEntry', feedId, fields, subscribers);
            });
        }

        logger.trace(fields, 'processed hn entry');

    };

    var handler = new world.htmlparser.DefaultHandler(callback.bind(this));
    var parser = new world.htmlparser.Parser(handler);
    parser.parseComplete(entry.content);

});

/**
 * Store an entry after it has been processed
 * --------------------------------------------------------------------
 */
dispatcher.on('storeEntry', function (feedId, entry, subscribers) {

    // The url is probably not entity encoded, but decode anyway just
    // to be sure. Entities were observed for a time in the HN feed,
    // which made for unclickable links
    // (https:&#x2F;&#x2F;news.ycombinator.com...)
    entry.url = world.entities.decodeXML(entry.url);

    // Encoded entities might appear in the title
    entry.title = world.entities.decodeXML(entry.title);

    var normalizedUrl = world.normalizeUrl(entry.url);

    var entryId = world.hash(normalizedUrl);

    var entryKey = world.keys.entryKey(entryId);

    world.redisClient.hget(entryKey, 'added', function (err, added) {
        var multi = world.redisClient.multi();
        var isNew = false;
        var key;

        if (!added) {
            // The entry is new
            entry.added = new Date().getTime();
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
            subscribers.forEach(function (subscriber) {
                multi.lpush(world.keys.unreadKey(subscriber), entryId);
            });

            // Advance the feed's updated date
            key = world.keys.feedKey(feedId);
            multi.hget(key, 'updated', function (err, updated) {
                updated = parseInt(updated, 10) || 0;

                if (entry.added > updated) {
                    world.redisClient.hset(key, 'updated', entry.added);
                }
            });
        }

        multi.exec(function (err) {
            if (err) {
                logger.error(err);
            }

            if (isNew) {
                logger.trace({feedId: feedId, entry: entryId}, 'saved entry');
            } else {
                logger.trace({feedId: feedId, entry: entryId}, 'updated entry');
            }
        });
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

var runInterval = 10 * 1000; // 10 seconds

var main = function () {

    var now = new Date().getTime();

    // Number of feeds to process per run
    var batchSize = 1;

    world.redisClient.zrangebyscore([world.keys.feedQueueKey, '-inf', now, 'LIMIT', 0, batchSize], function (err, feedIds) {
        if (err) {
            logger.error(err);
            return;
        }

        if (feedIds.length === 0) {
            return;
        }

        feedIds.forEach(function (feedId) {

            logger.trace({feedId: feedId}, 'pickup');

            world.redisClient.hmget([world.keys.feedKey(feedId), 'url', 'nextCheck', 'prevCheck'], function (err, result) {
                var url = result.shift();

                if (err) {
                    logger.error(err);
                    return;
                }

                // Sanity check: url should exist
                if (!url) {
                    world.redisClient.zrem(world.keys.feedQueueKey, feedId, function () {
                        logger.warn({feedId: feedId}, 'url missing');
                        return;
                    });
                }

                world.redisClient.zrem(world.keys.feedQueueKey, feedId, function (err) {
                    if (err) {
                        logger.error({redis: err}, 'redis error');
                    } else {
                        logger.trace({feedId: feedId}, 'dequeued');

                        world.redisClient.smembers(world.keys.feedSubscribersKey(feedId), function (err, subscribers) {
                            if (subscribers.length > 0) {
                                dispatcher.emit('prefetch', feedId, url, subscribers);
                            }
                        });
                    }
                });
            });
        });
    });

    setTimeout(main, runInterval);
};

main();
logger.info('startup');

/**
 * Clean up on shutdown
 * --------------------------------------------------------------------
 * nodemon sends the SIGUSR2 signal during restart
 */
process.once('SIGUSR2', function () {
    world.redisClient.unref();
    world.redisPubsubClient.unref();
    logger.info('shutting down');
    process.kill(process.pid, 'SIGUSR2');
});
