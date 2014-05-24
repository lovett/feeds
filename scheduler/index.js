var world = require("../world");
var redis = require("redis");

var main = function () {
    var now = new Date().getTime();
    world.client.zrangebyscore([world.keys.feedSubscriptionsKey, 1, '+inf'],  function (err, ids) {
        if (err) throw err;

        var multi = world.client.multi();

        var minMS = 1 * 60 * 60 * 1000;

        ids.forEach(function (id) {
            var key = world.keys.feedKey(id);
            
            multi.hmget([key, 'updated', 'nextCheck'], function (err, result) {
                var updated = parseInt(result.shift(), 10) || 0;
                var nextCheck = parseInt(result.shift(), 10) || 0;

                if (nextCheck > now) {
                    console.log(id + ' does not need to be checked for another ' + (nextCheck - now) + ' ms');
                    return;
                }

                if (updated > now - minMS) {
                    console.log(id + ' was recently updated, and does not to be checked');
                    world.client.hset(key, 'nextCheck', updated + minMS); 
                    return;
                }

                console.log('Fetching ' + id);

                world.client.publish('feed:fetch', id, function (err, received) {
                    world.client.hset(key, 'nextCheck', now + minMS); 
                });
            });
        });

        multi.exec(function (err, result) {
            setTimeout(main, 5 * 1000);
        });

    });
}

main();
