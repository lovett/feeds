var world = require('../world');

var main = function () {
    world.redisClient.keys('entry:*', function (err, keyList) {
        keyList.forEach(function (key) {
            world.redisClient.hget(key, 'title', function (err, title) {
                var decodedTitle;
                if (title) {
                    decodedTitle = world.entities.decodeXML(title);

                    if (decodedTitle !== title) {
                        world.redisClient.hset(key, 'title', decodedTitle, function (err) {                        
                            console.log('Before: ' + title)
                            console.log('After : ' + decodedTitle);
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
