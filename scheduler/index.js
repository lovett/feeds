var world = require('../world');
var redis = require('redis');
var subscriber = redis.createClient();

subscriber.on("subscribe", function (channel, count) {
    world.logger.info("Subscribed to " + channel);
});

subscriber.on("message", function (channel, id) {
    console.log('message: ' + channel + ' with id ' + id);
    if (channel === 'feed:reschedule') {
        scheduleFeed(id);
    }
});

var scheduleFeed = function (id) {
    var now = new Date().getTime();
    var multi = world.client.multi();
    var interval = world.minFetchInterval;


    world.client.zscore(world.keys.feedSubscriptionsKey, id, function (err, score) {
        var key = world.keys.feedKey(id);
        score = parseInt(score, 10);

        // No more subscribers
        if (score === 0) {
            multi.hdel(key, 'nextCheck');
            multi.zrem(world.keys.feedQueueKey, id);
            multi.exec(function (err, result) {
            });
            return;
        }
        
        // At least one subscriber
        world.client.hmget([key, 'updated', 'nextCheck'], function (err, result) {
            var updated = parseInt(result.shift(), 10) || 0;
            var nextCheck = parseInt(result.shift(), 10) || 0;
            var newNextCheck = 0;
            
            // The next check should be at least 1 interval from the last update.
            if (updated > 0 && nextCheck <= (updated + interval)) {
                newNextCheck = updated + interval;
            } else if (nextCheck === 0) {
                newNextCheck = now;
            }

            if (newNextCheck > 0) {
                multi.hset(key, 'nextCheck', newNextCheck);
                multi.zadd(world.keys.feedQueueKey, id, updated + interval);
                multi.exec();
                console.log('Rescheduled ' + id);
            } else {
                console.log('Nothing to do for ' + id);
            }
        });
    });
}

subscriber.subscribe('feed:reschedule')

