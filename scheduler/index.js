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
    var checkTime = params.shift();

    // Scheduling should only occur if the feed has subscribers.  The
    // number of subscribers is determined from the length of the
    // feed's subscribers key, not the score within the feed
    // subscriptions set.
    world.redisClient.smembers(world.keys.feedSubscribersKey(feedId), function (err, result) {
        var key = world.keys.feedKey(feedId);

        if (err) {
            logger.error(err);
            return;
        }

        if (result.length === 0) {
            descheduleFeed(feedId, key);
        } else {
            rescheduleFeed(feedId, key, checkTime);
        }
    });
};

/**
 * Make an inactive feed ineligible for further scheduling
 * --------------------------------------------------------------------
 */
descheduleFeed = function (feedId, key) {
    var multi = world.redisClient.multi();
    
    // Remove nextCheck to indicate the feed is inactive
    multi.hdel(key, 'nextCheck');
    
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
rescheduleFeed = function (feedId, key, checkTime) {
    var now = new Date().getTime();
    var interval = world.feedCheckInterval;
    var multi = world.redisClient.multi();
    
    
    // The feed has at least one subscriber
    world.redisClient.hmget([key, 'nextCheck'], function (err, result) {
        var nextCheck = parseInt(result.shift(), 10) || 0;
        var details = {};
        var verdict;

        if (checkTime) {
            verdict = 'explicitly scheduled';
            details.nextCheck = checkTime;
        } else if (nextCheck === 0) {
            // The feed has never been checked. Check it now.
            verdict = 'new feed';
            details.prevCheck = 0;
            details.nextCheck = now;
        } else if (nextCheck > now) {
            // The feed is already scheduled for a future check. Leave as-is.
            verdict = 'left as-is';
            details.nextCheck = nextCheck;
        } else if (nextCheck < now - world.minToMs(1)) {
            // The scheduled check was over 1 minute ago. It
            // must not have occurred. Check the feed now.
            verdict = 'previous check missed';
            details.nextCheck = now;
        } else {
            // The scheduled check was less than 1 minute ago. The
            // feed must have just been checked successfully. Check
            // again in the future, adding a random amount of
            // additional time to keep the overall schedule spread
            // out.
            verdict = 'rescheduled';
            details.prevCheck = nextCheck;
            details.nextCheck = now + interval + Math.floor(Math.random() * interval);
        }

        // Round to the nearest whole minute
        details.nextCheck = Math.round(details.nextCheck / world.minToMs(1)) * world.minToMs(1);

        multi.hmset(key, details);
        
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
