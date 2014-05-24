var world = require("../world");
var redis = require("redis");
var subscriber = redis.createClient();
var fs = require("fs");
var mkdirp = require('mkdirp');
var path = require('path');

var main = function () {
    var now = new Date().getTime();

    world.client.zrangebyscore([world.keys.feedQueueKey, '-inf', now, 'LIMIT', 0, 1], function (err, result) {

        if (result.length == 0) {
            return;
        }

        var id = result.pop();
        
        world.client.hget(world.keys.feedKey(id), 'url', function (err, url) {
            world.logger.info('Download ' + url);
            world.client.zrem(world.keys.feedQueueKey, id, function (err, result) {
                world.client.publish('feed:reschedule', id);
            });
        });
    });
    
    setTimeout(main, 10 * 1000);
};


main();
