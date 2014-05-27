var world = require('../world');
var logger = world.logger.child({source: 'scheduler'});

/**
 * Figure out when the next fetch of a feed should occur
 * --------------------------------------------------------------------
 * This is a pubsub callback for the feed:reschedule channel, which
 * gets messages when a feed is added or removed from the web UI or 
 * after the feed fetcher has completed a fetch.
 *
 * The interval is the minimum amount of time that should pass between
 * requests. It is the same for all feeds.
 */
var scheduleFeed = function (feedId) {
    var now = new Date().getTime();
    var multi = world.redisClient.multi();
    var interval = world.feedCheckInterval;

    world.redisClient.zscore(world.keys.feedSubscriptionsKey, feedId, function (err, score) {
        if (err) {
            logger.error(err);
            return;
        }

        var key = world.keys.feedKey(feedId);

        score = parseInt(score, 10);

        // The feed has no subscribers
        if (score === 0) {
            multi.hdel(key, 'nextCheck');
            multi.zrem(world.keys.feedQueueKey, feedId);
            multi.exec(function (err, result) {
                if (err) logger.error(err);
            });
            logger.trace({feed: feedId}, 'dequeued, no subscribers');
            return;
        }
        
        // The feed has at least one subscriber
        world.redisClient.hmget([key, 'updated', 'nextCheck'], function (err, result) {
            var updated = parseInt(result.shift(), 10) || 0;
            var nextCheck = parseInt(result.shift(), 10) || 0;
            var details = {};

            var verdict;

            if (nextCheck === 0) {
                // The feed has never been checked
                verdict = 'new feed';
                details.nextCheck = now;
                details.prevCheck = 0;
            } else if (nextCheck > now) {
                verdict = 'left as-is, next check is in future';
                details.nextCheck = nextCheck;
            } else {
                // The feed was previously checked
                verdict = 'rescheduled';
                details.prevCheck = nextCheck;
                details.nextCheck = now + interval;
            }

            // round to the nearest whole minute
            details.nextCheck = Math.round(details.nextCheck / world.minToMs(1)) * world.minToMs(1);
            
            logger.trace({feed: feedId, details: details}, verdict);
                
            multi.hmset(key, details);
            multi.zadd([world.keys.feedQueueKey, details.nextCheck, feedId]);
            multi.exec(function (err, result) {
                if (err) {
                    logger.error(err);
                    return;
                }
            });
        });
    });
}

world.redisPubsubClient.on('subscribe', function (channel, count) {
    logger.trace({channel: channel, count: count}, 'listening');
});

world.redisPubsubClient.on('message', function (channel, feedId) {
    logger.trace({channel: channel, feed: feedId}, 'scheduling');
    scheduleFeed(feedId);
});

world.redisPubsubClient.subscribe('feed:reschedule');

logger.trace('startup');


/**
 * Reschedule forgotten feeds
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
