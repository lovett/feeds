var world = require('../world');

var main = function () {
    world.redisClient.keys('entry:*', function (err, keyList) {
        keyList.forEach(function (key) {
            world.redisClient.hget(key, 'hnLink', function (err, hnLink) {
                var decodedLink;
                if (hnLink) {
                    decodedLink = world.entities.decodeXML(hnLink);

                    if (decodedLink !== hnLink) {
                        world.redisClient.hset(key, 'hnLink', decodedLink, function (err) {                        
                            console.log("Converted " + hnLink + " to " + decodedLink);
                        });
                    }
                }
            });
        });

        world.redisPubsubClient.unref();
        world.redisClient.unref();    
        world.client.unref();
    });
};

main();
