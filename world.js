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
    logger: function () {
        var l = require('little-logger');
        return new l.Logger('debug');
    }(),
};
