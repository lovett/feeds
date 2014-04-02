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
    archiveHash: function (key) {
        return hash = this.cityhash.hash64(key).value;
    }
};
