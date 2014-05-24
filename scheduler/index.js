var world = require('../world');
var redis = require('redis');
var subscriber = redis.createClient();

subscriber.on("subscribe", function (channel, count) {
    world.logger.info("Subscribed to " + channel);
});

subscriber.on("message", function (channel, id) {
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

            if (updated > 0 && nextCheck <= (updated + interval)) {
                // The feed has been updated since it was last checked.
                // The next check should be at least one interval from the last update
                newNextCheck = updated + interval;
            } else if (nextCheck === 0) {
                // The feed has never been checked. Check it now.
                console.log(id + ' has never been checked');
                newNextCheck = now;
            } else {
                // Check the feed at a future time.
                console.log(id + ' was checked before; check again in future');
                newNextCheck = now + interval;
            }

            multi.hset([key, 'nextCheck', newNextCheck]);
            multi.zadd([world.keys.feedQueueKey, newNextCheck, id]);
            multi.exec(function (err, result) {
                console.log('Rescheduled ' + id + ' to ' + newNextCheck);
            });
        });
    });
}

subscriber.subscribe('feed:reschedule')

