var crypto, url;

crypto = require('crypto');
url = require('url');

/**
 * Figure out how to fetch a feed
 * --------------------------------------------------------------------
 * Feeds from Reddit, StackExchange, and Hacker News are requested via
 * their respective APIs. All other feeds are requested directly.
 */
module.exports = function (args) {
    'use strict';

    var fetchEvent, fetchId, host;
    host = url.parse(args.url).host;

    if (host.indexOf('reddit.com') > -1) {
        fetchEvent = 'fetch:reddit';
    } else if (host.indexOf('stackexchange.com') > -1) {
        fetchEvent = 'fetch:stackexchange';
    } else if (host === 'news.ycombinator.com') {
        fetchEvent = 'fetch:hn';
    } else {
        fetchEvent = 'fetch:default';
    }

    fetchId = crypto.pseudoRandomBytes(10).toString('hex');

    this.emit(fetchEvent, {
        id: args.id,
        fetchId: fetchId,
        url: args.url
    });
};
