module.exports = {
    events: require('events'),
    client: require('redis').createClient(),
    request: require('request'),
    url: require('url'),
    util: require('util'),
    htmlparser: require('htmlparser'),
    console: console,
    moment: require('moment'),
    logger: function () {
        var l = require('little-logger');
        return new l.Logger('debug');
    }(),
    config: {
        feed_check_interval: 120 // in minutes
    }
};
