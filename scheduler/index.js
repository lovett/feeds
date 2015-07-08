var world = require('../world');
var logger = world.logger.child({source: 'scheduler'});

/**
 * Decide whether to fetch a feed in the future
 *
 * This is a pubsub callback on the Redis feed:reschedule channel, which
 * receives messages when someone subscribes to a feed, unsubscribes, or
 * after a fetch has occurred.
 *
 * A feed should only be scheduled for fetching if it has
 * subscribers. If it doesn't, it should be made inactive.
 *
 * The message argument is either a string containing a feed ID or a
 * double colon delimited string containing a feed ID and a unix
 * timestamp of when the next fetch should occur.
 */
function scheduleFeed(message) {
    var messageFields, feedId, timestamp, subscribersKey;
    
    messageFields = message.split('::');
    feedId = messageFields[0];
    timestamp = messageFields[1];
    subscribersKey = world.keys.feedSubscribersKey(feedId);

    world.redisClient.smembers(subscribersKey, function (err, result) {
        if (err) {
            logger.error(err);
            return;
        }

        if (result.length === 0) {
            descheduleFeed(feedId);
        } else {
            rescheduleFeed(feedId, timestamp);
        }
    });
}


/**
 * Mark a feed with no subscribers ineligible for rescheduling
 *
 * A feed with without a nextCheck is considered inactive.
 */
function descheduleFeed(feedId) {
    var multi, feedKey;
    multi = world.redisClient.multi();
    feedKey = world.keys.feedKey(feedId);

    multi.hdel(feedKey, 'nextCheck');

    // Take the feed out of the schedule
    multi.zrem(world.keys.feedQueueKey, feedId);

    // Prevent the feed from being rescheduled
    multi.zadd(world.keys.feedSubscriptionsKey, 0, feedId);

    multi.exec(function (err) {
        if (err) {
            logger.error(err);
            return;
        }

        logger.trace({feed: feedId}, 'dequeued, no subscribers');
    });
}


/**
 * Schedule a feed for fetching
 *
 * Slow-moving feeds get checked once per day. Fast-moving feeds are
 * checked multiple times per day.
 */
function rescheduleFeed(feedId, timestamp) {
    var now, multi, feedKey, oneDayMs;
    
    multi = world.redisClient.multi();
    now = new Date().getTime();
    oneDayMs = world.minToMs(60 * 24);
    feedKey = world.keys.feedKey(feedId);

    world.redisClient.hgetall(feedKey, function (err, feed) {
        var contentAgeMs;
        
        Object.keys(feed).map(function (key) {
            if (key === 'prevCheck' || key === 'nextCheck' || key === 'updated') {
                feed[key] = parseInt(feed[key], 10);
                return true;
            }
        });

        if (timestamp) {
            feed.verdict = 'explicitly scheduled';
            feed.nextCheck = timestamp;
        } else if (!feed.nextCheck && !feed.prevCheck) {
            feed.verdict = 'new feed';
            feed.nextCheck = now;
        } else if (feed.nextCheck > now) {
            feed.verdict = 'left as-is';
        } else if (feed.prevCheck < now - (world.feedCheckInterval * 3)) {
            feed.verdict = 'stale';
            feed.nextCheck = now;
        } else {
            // The feed was checked within the past 3 intervals. Check
            // again at least 1 interval from now if the content has
            // recently updated. If not, check tomorrow.
            contentAgeMs = now - feed.updated;

            if (contentAgeMs > oneDayMs) {
                feed.verdict = 'try tomorrow';
                feed.nextCheck = now + oneDayMs + Math.floor(Math.random() * world.feedCheckInterval);
            } else {
                feed.verdict = 'rescheduled';
                feed.nextCheck = now + world.feedCheckInterval + Math.floor(Math.random() * world.feedCheckInterval);
            }
        }

        // Round to the nearest whole minute
        feed.nextCheck = Math.round(feed.nextCheck / world.minToMs(1)) * world.minToMs(1);

        multi.hmset(feedKey, feed);

        multi.zadd([world.keys.feedQueueKey, feed.nextCheck, feedId]);

        multi.exec(function (err) {
            if (err) {
                logger.error(err);
            } else {
                logger.trace({
                    url: feed.url,
                    redisCLI: world.keys.feedKeyCLI(feedId),
                    previousCheck: new Date(feed.prevCheck),
                    nextCheck: new Date(feed.nextCheck)
                }, feed.verdict);
            }
            return;
        });
    });
}


world.redisPubsubClient.on('subscribe', function (channel, count) {
    logger.trace({channel: channel, count: count}, 'listening');
});


world.redisPubsubClient.on('message', function (channel, feedId) {
    logger.trace({feed: feedId}, 'scheduling');
    scheduleFeed(feedId);
});


world.redisPubsubClient.subscribe('feed:reschedule');


logger.info('startup');


/**
 * Attempt to reschedule all active feeds
 *
 * Ideally, this script is always running and answers all rescheudling
 * events promptly. If not, a feed might never make it back into the
 * fetch queue. By rescheduling everything, nothing gets left behind.
 */
world.redisClient.zrangebyscore([world.keys.feedSubscriptionsKey, 1, '+inf'], function (err, result) {
    if (err) {
        logger.error(err);
        return;
    }

    result.forEach(function (feedId) {
        scheduleFeed(feedId);
    });

});


/**
 * Shutdown cleanup
 * 
 * Triggered by nodemon during server restart
 */
process.once('SIGUSR2', function () {
    world.redisPubsubClient.unsubscribe('feed:reschedule');
    world.redisClient.unref();
    world.redisPubsubClient.unref();
    logger.info('shutting down');
    process.kill(process.pid, 'SIGUSR2');
});
