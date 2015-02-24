var world = require('../world');
var needle = require('needle');
var path = require('path');
var logger = world.logger.child({source: 'feedfetcher'});
var dispatcher = new world.events.EventEmitter();
var Firebase = require('firebase');

// Number of feeds to process per run
var batchSize = 1;

var hnFirebase;

/**
 * Find the best strategy for requesting a feed
 * --------------------------------------------------------------------
 * Feeds from Reddit, StackExchange, and Hacker News are requested via
 * their respective APIs. All other feeds are requested via the Google
 * Feed API.
 */
dispatcher.on('fetch', function (feedId, feedUrl, subscribers) {
    var host, event;
    host = world.url.parse(feedUrl).host;

    if (host.indexOf('reddit.com') > -1) {
        event = 'fetch:reddit';
    } else if (host.indexOf('stackexchange.com') > -1) {
        event = 'fetch:stackexchange';
    } else if (host === 'news.ycombinator.com') {
        event = 'fetch:hn';
    } else {
        event = 'fetch:google';
    }

    dispatcher.emit(event, feedId, feedUrl, subscribers);
});

/**
 * Fetch Hacker News stories via Firebase API
 * --------------------------------------------------------------------
 */
dispatcher.on('fetch:hn', function (feedId, feedurl, subscribers) {
    if (hnFirebase) {
        // the Firebase client is already connected; request rescheduling
        world.redisClient.hset(world.keys.feedKey(feedId), 'prevCheck', new Date().getTime());
        world.redisClient.publish('feed:reschedule', feedId);
        logger.trace({feedId: feedId}, 'fetch complete, reschedule requested');
        return;
    }

    hnFirebase = new Firebase('https://hacker-news.firebaseio.com/v0');
    var topStories = hnFirebase.child('/topstories').limitToFirst(30);

    topStories.on('value', function (snapshot) {
        var storyIds, redisKeys, keyMaker;

        keyMaker = function (id) {
            return 'hnid:' + id;
        };

        // convert snapshot to an array of story ids
        storyIds = snapshot.val();

        // map story ids to redis keys
        redisKeys = storyIds.map(function (id) {
            return keyMaker(id);
        });

        world.redisClient.mget(redisKeys, function (err, res) {
            res.forEach(function (storyId, index) {
                var redisKey;
                if (storyId !== null) {  // the story has recently been fetched; ignore it
                    return;
                }

                storyId = storyIds[index];
                redisKey = keyMaker(storyId);

                world.redisClient.set(redisKey, storyId, 'EX',  600, function (err, res) {
                    if (res === 'OK') {
                        dispatcher.emit('processEntry:hn', feedId, storyIds[index], subscribers);
                    }

                    if (err) {
                        console.log(err);
                    }
                });
            });
        });
    });

    world.redisClient.hset(world.keys.feedKey(feedId), 'prevCheck', new Date().getTime());
    world.redisClient.publish('feed:reschedule', feedId);
    logger.trace({feedId: feedId}, 'fetch complete, reschedule requested');

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

        /*jshint camelcase:false */
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
    var parsedUrl, jsonPath, jsonUrl, subreddit;

    parsedUrl = world.url.parse(feedUrl);
    subreddit = parsedUrl.path.split('/')[2];

    jsonUrl = 'https://www.reddit.com/r/' + subreddit + '/.json';

    if (feedUrl.indexOf('.rss') > -1) {
        jsonPath = path.dirname(parsedUrl.path) + '/.json';
        jsonUrl = feedUrl.replace(parsedUrl.path, jsonPath);
    } else {
        jsonUrl = feedUrl + '/.json';
    }

    needle.get(jsonUrl, function (err, response) {
        if (err || response.statusCode !== 200) {
            world.logger.error({err: err, status: response.responseStatus}, 'reddit api request failed, will try later');
            world.redisClient.publish('feed:reschedule', feedId);
            return;
        }

        /*jshint camelcase:false */
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

        // Warn if there are no entries in the feed
        if (feed.entries.length === 0) {
            logger.warn({feedId: feedId, feedUrl: feedUrl, googleUrl: endpoint}, 'no entries found');
        }

        // Update the feed URL if Google indicates a different one
        if (feedUrl !== feed.feedUrl) {
            logger.info({'feedId': feedId, 'oldUrl': feedUrl, 'newUrl': feed.feedUrl}, 'updating feed url');
            world.redisClient.hset(world.keys.feedKey(feedId), 'url', feed.feedUrl, function (err) {
                if (err) {
                    world.logger.error({err: err}, 'unable to update feed url');
                }
            });
        }

        // Advance the feed's last-checked-on date
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
dispatcher.on('processEntry:hn', function (feedId, storyId, subscribers) {
    var self = this;
    hnFirebase.child('/item/' + storyId).once('value', function (snapshot) {
        var story = snapshot.val();

        // val() could have returned a null, indicating the snapshot was empty
        if (!(story instanceof Object)) {
            return;
        }

        if (!(story.kids instanceof Array)) {
            story.kids = [];
        }

        if (!('dead' in story)) {
            story.dead = false;
        }

        var entry = {
            title: story.title,
            date: story.time,
            url: story.url,
            hnLink: 'https://news.ycombinator.com/item?id=' + storyId,
            hnComments: story.kids.length,
            score: story.score,
            dead: story.dead || false,
            type: story.type
        };

        self.emit('storeEntry', feedId, entry, subscribers);
        logger.trace(entry, 'processed hn entry');
    });
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
                                dispatcher.emit('fetch', feedId, url, subscribers);
                            } else {
                                logger.trace({feedId: feedId}, 'no subscribers');
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
