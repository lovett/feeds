var config = require('config');
var redis = require('redis');
var bunyan = require('bunyan');

module.exports = {
    config: config,
    events: require('events'),
    client: redis.createClient(),
    redisClient: redis.createClient(),
    redisPubsubClient: redis.createClient(),
    request: require('request'),
    url: require('url'),
    util: require('util'),
    htmlparser: require('htmlparser'),
    console: console,
    moment: require('moment'),
    cityhash: require('cityhash'),
    logger: bunyan.createLogger({
        name: 'headlines',
        streams: [
            {
                path: config.logPath,
                level: config.logLevel
            }
        ]
    }),

    archivePath: function (hash) {
        return "archive/" + hash.substr(0, 1) + "/" + hash.substr(0, 2) + "/" + hash;
    },
    hash: function (key) {
        return this.cityhash.hash64(key).value;
    },
    keys: {
        feedSubscriptionsKey: "feeds:subscriptions",
        feedKey: function (feedId, userId) {
            var value = 'feed:' + feedId;
            if (userId) {
                value += ':' + userId;
            }
            return value;
        },
        feedListKey: function(userId) {
            return "feeds:" + userId;
        },
        feedQueueKey: 'feeds:queue'
    }
};
