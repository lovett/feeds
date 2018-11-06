/** @module fetch/feed */
'use strict';

const crypto = require('crypto');
const needle = require('needle');
const FeedParser = require('feedparser');
const url = require('url');

/**
 * Convert a FeedParser item to an entry.
 *
 * @param {Number} feedId - The feed unique identifier provided to the listener.
 * @param {String} feedUrl - The URL provided to the listener.
 * @param {String} fetchId - The unique identifier for this fetch.
 * @param {Object} item - A normalized feed item returned by FeedParser.
 * @fires entry-store
 */
function transformItem(feedId, feedUrl, fetchId, item) {
    let entry = {
        feedUrl: feedUrl,
        feedId: feedId,
        fetchId: fetchId,
        author: item.author,
        title: item.title,
        guid: item.guid,
        body: item.description,
        url: (item.origlink || item.link),
        extras: {
            keywords: []
        },
        discussion: {
            url: null,
            label: 'self',
            commentCount: null
        }
    };

    if (item.pubdate) {
        entry.created = new Date(item.pubdate);
    }

    if (item.categories) {
        entry.extras.keywords = item.categories;
    }

    if (item.comments) {
        entry.discussion.url = item.comments;

        // There's no guarantee the item guid will be a URL.
        try {
            entry.discussion.label = new url.URL(item.guid).hostname;
        } catch (_) {
        }
    }

    if (item['slash:comments'] && item['slash:comments']['#']) {
        entry.discussion.commentCount = parseInt(
            item['slash:comments']['#'],
            10
        );
    }

    if (item['slash:section']) {
        entry.extras.keywords.push(item['slash:section']['#']);
    }

    // Remove the comment link from a lobste.rs entry body since it is
    // redundant, but otherwise keep the body intact.
    if (entry.discussion.label === 'lobste.rs') {
        entry.body = entry.body.replace(/<a [^>]+>Comments<\/a>/, '');
        entry.body = entry.body.replace('<p></p>', '') || null;
    }

    this.emit('entry-store', entry);
}

/**
 * Fetch entries from RSS, Atom, or other standard syndication format.
 *
 * Feed parsing is provided by the {@link https://github.com/danmactough/node-feedparser|FeedParser Library}.
 *
 * @param {Number} feedId - Unique identifier of the feed to be fetched.
 * @param {String} feedUrl - URL of the feed to be fetched.
 * @param {fetchCallback} callback - A function to invoke on success or failure.
 * @event fetch-feed
 * @fires stats-fetch
 * @fires feed-update
 */
module.exports = function (feedId, feedUrl, callback = () => {}) {
    const self = this;

    const fetchId = crypto.pseudoRandomBytes(10).toString('hex');

    let guids = [];

    let parseError = null;
    let responseStatus = null;

    const parser = new FeedParser();

    parser.on('error', function (err) {
        parseError = err;
    });

    parser.on('meta', function (meta) {
        self.emit('feed-update', feedId, {
            description: meta.description,
            siteUrl: meta.link,
            title: meta.title,
            updated: meta.date,
            url: meta.xmlurl
        });
    });

    parser.on('readable', function () {
        let item = null;
        while (item = this.read()) {
            if (item.guid) {
                guids.push(item.guid);
                transformItem.call(self, feedId, feedUrl, fetchId, item);
            }
        }
    });

    const feedStream = needle.get(feedUrl, {
        open_timeout: 5000,
        response_timeout: 10000,
        follow_max: 2,
        parse_response: false
    });

    feedStream.pipe(parser);

    feedStream.on('header', (statusCode, headers) => {
        responseStatus = statusCode;
    });

    feedStream.on('done', function (err) {
        let callbackError, parseFail = false;
        if (err) {
            // Status code zero is used to indicate fetch failure.
            responseStatus = 0;
            callbackError = err;
        }

        if (parseError) {
            callbackError = parseError;
            parseFail = true;
        }

        self.emit('stats-fetch', feedId, fetchId, responseStatus, parseFail);

        callback(null);
    });
};
