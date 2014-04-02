var world = require("./world");
var redis = require("redis");
var subscriber = redis.createClient();
var fs = require("fs");
var mkdirp = require('mkdirp');
var path = require('path');

subscriber.on("subscribe", function (channel, count) {
    world.logger.info("Subscribed to " + channel);
});

subscriber.on("message", function (channel, id) {
    var key = "entry:" + id;
    
    world.client.hget(key, "url", function (err, url) {
        var hash = world.archiveHash(url);
        var file_path = world.archivePath(hash);

        mkdirp.sync(path.dirname(file_path));

        var out = fs.createWriteStream(file_path);
        out.on('finish', function () {
            world.logger.debug("Downloaded " + url);
            world.client.publish("entry:index", id);
        });
        world.request(url).pipe(out);


    });
    
});

subscriber.subscribe("entry:download");


