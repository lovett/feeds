/** @module fetch */
'use strict';

const url = require('url');

/**
 * Callback for the fetch event.
 *
 * @callback fetchCallback
 * @param {error} [err] - Fetch error.
 *
 */

/**
 * Delegate feed fetching to take advantage of site-specific APIs.
 *
 * Some sites offer custom APIs that provide more information than
 * is available from the feed alone. Use site-specific handlers to
 * take advantage of this.
 *
 * The default handler is a catch-all for all other feed formats (RSS,
 * Atom, etc).
 *
 * @param {Number} feedId - Unique identifier of the feed to be fetched.
 * @param {String} feedUrl - URL of the feed to be fetched.
 * @param {fetchCallback} - A function to invoke on success or failure.
 * @event fetch
 * @fires fetch:reddit
 * @fires fetch-hackernews
 * @fires fetch:default
 */
module.exports = function (feedId, feedUrl, callback = () => {}) {
    const host = url.parse(feedUrl).host;

    let delegate = 'fetch:default';

    if (host.indexOf('reddit.com') > -1) {
        delegate = 'fetch:reddit';
    }

    if (host === 'news.ycombinator.com') {
        delegate = 'fetch-hackernews';
    }

    this.emit(delegate, feedId, feedUrl, callback);
};
