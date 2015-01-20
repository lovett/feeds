var world = require('../world');
var logger = world.logger.child({source: 'scheduler'});

var scheduleFeed, descheduleFeed, rescheduleFeed;

/**
 * Figure out when to update a feed
 * --------------------------------------------------------------------
 * This is a pubsub callback on the Redis feed:reschedule channel, which
 * receives messages when someone subscribes to a feed, unsubscribes, or
 * after an update has occurred.
 *
 * The minimum interval between updates is the same for all feeds.
 */
scheduleFeed = function (params) {
    params = params.split('::');
    var feedId = params.shift();
    var timestamp = params.shift();
    var subscribersKey = world.keys.feedSubscribersKey(feedId);

    // Scheduling should only occur if the feed has subscribers.  The
    // number of subscribers is determined from the length of the
    // feed's subscribers key.
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
};

/**
 * Make an inactive feed ineligible for further scheduling
 * --------------------------------------------------------------------
 */
descheduleFeed = function (feedId) {
    var multi = world.redisClient.multi();
    var feedKey = world.keys.feedKey(feedId);

    // Remove nextCheck to indicate the feed is inactive
    multi.hdel(feedKey, 'nextCheck');

    // Take the feed out of the schedule
    multi.zrem(world.keys.feedQueueKey, feedId);

    // Prevent the feed from being rescheduled
    multi.zadd(world.keys.feedSubscriptionsKey, 0, feedId);

    multi.exec(function (err) {
        if (err) {
            logger.error(err);
        } else {
            logger.trace({feed: feedId}, 'dequeued, no subscribers');
        }
    });
};

/**
 * Update the next check date of a feed
 * --------------------------------------------------------------------
 */
rescheduleFeed = function (feedId, timestamp) {
    var now = new Date().getTime();
    var interval = world.feedCheckInterval;
    var multi = world.redisClient.multi();
    var feedKey = world.keys.feedKey(feedId);

    world.redisClient.hmget([feedKey, 'prevCheck', 'nextCheck', 'updated'], function (err, result) {
        var prevCheck = parseInt(result.shift(), 10) || 0;
        var nextCheck = parseInt(result.shift(), 10) || 0;
        var details = {};
        var verdict;

        if (timestamp) {
            verdict = 'explicitly scheduled';
            details.nextCheck = timestamp;
        } else if (nextCheck === 0 && prevCheck === 0) {
            // The feed has never been checked. Check it now.
            verdict = 'new feed';
            details.nextCheck = now;
        } else if (prevCheck < now - (interval * 3)) {
            // The feed was last checked more than 3 intervals ago. Check it now.
            verdict = 'stale';
            details.nextCheck = now;
        } else if (nextCheck > now) {
            // The feed is already scheduled for a future check. Leave as-is.
            verdict = 'left as-is';
            details.nextCheck = nextCheck;
        } else {
            // The feed was recently checked. Check again in the future, adding a
            // random amount of additional time to keep the overall
            // schedule spread out.
            verdict = 'rescheduled';
            details.nextCheck = now + interval + Math.floor(Math.random() * interval);
        }

        // Round to the nearest whole minute
        details.nextCheck = Math.round(details.nextCheck / world.minToMs(1)) * world.minToMs(1);

        multi.hmset(feedKey, details);

        multi.zadd([world.keys.feedQueueKey, details.nextCheck, feedId]);

        multi.exec(function (err) {
            if (err) {
                logger.error(err);
            } else {
                logger.trace({feed: feedId, details: details}, verdict);
            }
            return;
        });
    });

};


world.redisPubsubClient.on('subscribe', function (channel, count) {
    logger.trace({channel: channel, count: count}, 'listening');
});

world.redisPubsubClient.on('message', function (channel, feedId) {
    logger.trace({channel: channel, feed: feedId}, 'scheduling');
    scheduleFeed(feedId);
});

world.redisPubsubClient.subscribe('feed:reschedule');

logger.info('startup');


/**
 * Housekeeping
 * --------------------------------------------------------------------
 *
 * Ideally, this script is always running and never misses a
 * reschedule message. But if there is downtime, a missed recheduling
 * will cause a feed to never get back into the fetch queue. To
 * prevent that, attempt to reschedule all active feeds.
 *
 * It would be tempting to only consider feeds whose nextCheck is in
 * the past, but there is no single key for that.
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
 * Clean up on shutdown
 * --------------------------------------------------------------------
 * nodemon sends the SIGUSR2 signal during restart
 */
process.once('SIGUSR2', function () {
    world.redisPubsubClient.unsubscribe('feed:reschedule');
    world.redisClient.unref();
    world.redisPubsubClient.unref();
    logger.info('shutting down');
    process.kill(process.pid, 'SIGUSR2');
});
