module.exports = {
    config: require('config'),
    events: require('events'),
    client: require('redis').createClient(),
    request: require('request'),
    url: require('url'),
    util: require('util'),
    htmlparser: require('htmlparser'),
    console: console,
    moment: require('moment'),
    cityhash: require('cityhash'),
    logger: function () {
        var l = require('little-logger');
        return new l.Logger('debug');
    }(),
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
    },
    minFetchInterval: 6000
};
