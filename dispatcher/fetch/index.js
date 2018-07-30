'use strict';

const url = require('url');

/**
 * Delegate feed fetching to take advantage of site-specific APIs.
 *
 * Some sites offer custom APIs that provide more information than
 * is available from the feed alone.
 */
module.exports = function (feedId, feedUrl, callback = () => {}) {
    const self = this;
    const host = url.parse(feedUrl).host;

    if (host.indexOf('reddit.com') > -1) {
        self.emit('fetch:reddit', feedId, feedUrl, callback);
        return;
    }

    if (host === 'news.ycombinator.com') {
        self.emit('fetch:hackernews', feedId, feedUrl, callback);
        return;
    }

    self.emit('fetch:default', feedId, feedUrl, callback);
};
