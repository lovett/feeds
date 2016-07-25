var world = require('../world');
var needle = require('needle');
var path = require('path');
var logger = world.logger.child({source: 'feedfetcher'});
var dispatcher = new world.events.EventEmitter();
var firebase = require('firebase');

// Number of feeds to process per run
var batchSize = 1;

var hnFirebase;

/**
 * Figure out how to fetch a feed
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
        event = 'fetch:direct';
    }

    dispatcher.emit(event, feedId, feedUrl, subscribers);
});

/**
 * Tell the scheduler to reschedule a feed
 * --------------------------------------------------------------------
 * Handles both failure and success according to the value of the err
 * argument, which can either be an object or a numeric HTTP response code
 */
dispatcher.on('reschedule', function (feedId, err) {

    if (typeof errOrStatus === 'number') {
        world.logger.error({feedId: feedId, status: err}, 'rescheduling after failure');
    } else if (err) {
        world.logger.error({feedId: feedId, err: err}, 'rescheduling after failure');
    } else {
        world.logger.trace({feedId: feedId}, 'rescheduling after success');
        world.redisClient.hset(world.keys.feedKey(feedId), 'prevCheck', new Date().getTime());
    }

    world.redisClient.publish('feed:reschedule', feedId);

});

/**
 * Fetch Hacker News stories via Firebase API
 * --------------------------------------------------------------------
 */
dispatcher.on('fetch:hn', function (feedId, feedurl, subscribers) {
    if (hnFirebase) {
        // the Firebase client is already connected; skip to postfetch
        dispatcher.emit('reschedule', feedId);
        return;
    }

    var firebaseConnection = firebase.initializeApp({
        databaseURL: 'https://hacker-news.firebaseio.com'
    });

    hnFirebase = firebaseConnection.database();

    var topStories = hnFirebase.ref('/v0/topstories').limitToFirst(30);

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

    dispatcher.emit('reschedule', feedId);
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
        if (err) {
            dispatcher.emit('reschedule', feedId, err);
            return;
        }

        if (response.statusCode !== 200) {
            dispatcher.emit('reschedule', feedId, response.statusCode);
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

        dispatcher.emit('reschedule', feedId);
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
        if (err) {
            dispatcher.emit('reschedule', feedId, err);
            return;
        }

        if (response.statusCode !== 200) {
            dispatcher.emit('reschedule', feedId, response.statusCode);
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

        dispatcher.emit('reschedule', feedId);
    });
});

dispatcher.on('fetch:direct', function (feedId, feedUrl, subscribers) {
    dispatcher.emit('reschedule', feedId);
});

/**
 * Process a feed entry
 * --------------------------------------------------------------------
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

    hnFirebase.ref('/v0/item/' + storyId).once('value', function (snapshot) {
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

        if (!entry.url) {
            entry.url = entry.hnLink;
        }

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

                world.redisClient.smembers(world.keys.feedSubscribersKey(feedId), function (err, subscribers) {
                    if (err) {
                        logger.error({redis: err}, 'redis error');
                    }

                    if (subscribers.length < 1) {
                        world.redisClient.zrem(world.keys.feedQueueKey, feedId);
                        logger.trace({feedId: feedId, url: url}, 'dequeued - no subscribers');
                    } else {
                        dispatcher.emit('fetch', feedId, url, subscribers);
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
