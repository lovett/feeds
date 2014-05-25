var world = require('../world');
var logger = world.logger.child({source: 'feedfetcher'});

/**
 * Fetch and parse the entries from a feed
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
    
    world.redisClient.zrangebyscore([world.keys.feedQueueKey, '-inf', now, 'LIMIT', 0, batchSize], function (err, ids) {
        if (err) {
            logger.error(err);
            return;
        }

        if (ids.length == 0) return;

        ids.forEach(function (id) {
            world.redisClient.hget(world.keys.feedKey(id), 'url', function (err, url) {
                if (err) {
                    logger.error(err);
                    return;
                }

                // A feed without a url; this shouldn't happen
                if (!url) {
                    logger.warn({feed: id}, 'url missing');
                    return;
                }
                
                logger.info({feed: id, url: url}, 'starting fetch');

                // TODO: migrate request handler and entry partsing from manager script
                
                world.redisClient.zrem(world.keys.feedQueueKey, id, function (err, result) {
                    logger.info({feed: id}, 'dequeued');
                    world.redisClient.publish('feed:reschedule', id);
                });
            });
        });
    });
    
    setTimeout(main, runInterval);
};

main();
