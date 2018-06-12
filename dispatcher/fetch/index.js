'use strict';

const url = require('url');

/**
 * Delegate feed fetching to a site-specific handler.
 *
 * Feeds from Reddit, StackExchange, and Hacker News are requested via
 * their respective APIs. All other feeds are requested directly.
 */
module.exports = function (feedId, feedUrl) {
    const self = this;
    const host = url.parse(feedUrl).host;

    if (host.indexOf('reddit.com') > -1) {
        self.emit('fetch:reddit', feedId, feedUrl);
        return;
    }

    if (host.indexOf('stackexchange.com') > -1) {
        self.emit('fetch:stackexchange', feedId, feedUrl);
        return;
    }

    if (host === 'news.ycombinator.com') {
        self.emit('fetch:hn', feedId, feedUrl);
        return;
    }

    self.emit('fetch:default', feedId, feedUrl);
};
