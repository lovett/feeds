/** @module fetch/hackernews */
'use strict';

const crypto = require('crypto');
const needle = require('needle');
const itemLimit = 30;
const url = require('url');
const querystring = require('querystring');

const baseUrl = new url.URL('https://hacker-news.firebaseio.com');

/**
 * Recursively request individual stories by ID.
 *
 * @param {Number} feedId - The feed unique identifier provided to the listener.
 * @param {String} feedUrl - The URL provided to the listener.
 * @param {fetchCallback} - The callback provided to the listener.
 * @param {String} fetchId - The unique identifier for this fetch.
 * @param {Number[]} itemIds - A list of story IDs.
 */
function getStories(feedId, feedUrl, callback, fetchId, itemIds) {
    if (itemIds.length === 0) {
        callback(null);
        return;
    }

    const endpoint = new url.URL(`/v0/item/${itemIds[0]}.json`, baseUrl);

    needle.get(endpoint.toString(), {
        open_timeout: 5000,
        response_timeout: 10000,
        follow_max: 2,
        parse_response: true
    }, (err, res, body) => {
        if (err) {
            callback(err);
            return;
        }

        if (res.statusCode !== 200) {
            callback(new Error(`Story endpoint responded with ${res.statusCode}`));
            return;
        }

        transformStory.call(this, feedId, feedUrl, fetchId, body);

        // This is redundant with the earlier check, but avoids
        // a timeout when processing the last item in the id list.
        if (itemIds.length === 1) {
            callback(null);
            return;
        }

        setTimeout(() => {
            getStories.call(this, feedId, feedUrl, callback, fetchId, itemIds.slice(1));
        }, 1000);
    });
}

/**
 * Convert a story to an entry.
 *
 * @param {Number} feedId - The feed unique identifier provided to the listener.
 * @param {String} feedUrl - The URL provided to the listener.
 * @param {String} fetchId - The unique identifier for this fetch.
 * @param {Object} story - The JSON object returned by the Hacker News API.
 * @fires entry:store
 */
function transformStory(feedId, feedUrl, fetchId, story) {
    this.emit('entry:store', {
        feedUrl: feedUrl,
        feedId: feedId,
        fetchId: fetchId,
        author: story.by,
        title: story.title,
        created: new Date(story.time * 1000),
        url: story.url,
        extras: {
            dead: story.dead,
            score: story.score,
            keywords: story.type
        },
        discussion: {
            url: 'https://news.ycombinator.com/item?id=' + story.id,
            label: 'news.ycombinator.com',
            commentCount: story.descendants
        },
        body: story.text
    });
}

/**
 * Fetch entries from Hacker News via its {@link https://github.com/HackerNews/API|Firebase Rest API}.
 *
 * The Firebase SDK is not used because it is a hassle.
 *
 * @param {Number} feedId - Unique identifier of the feed to be fetched.
 * @param {String} feedUrl - URL of the feed to be fetched.
 * @param {fetchCallback} callback - A function to invoke on success or failure.
 * @event fetch-hackernews
 * @fires stats:fetch
 * @fires feed:update
 */
module.exports = function (feedId, feedUrl, callback = () => {}) {
    const fetchId = crypto.pseudoRandomBytes(10).toString('hex');

    // Only the topstories feed is supported at this time.
    const endpoint = new url.URL('/v0/topstories.json', baseUrl);
    endpoint.search = querystring.stringify({
        limitToFirst: itemLimit,
        orderBy: '"$key"'
    });

    needle.get(endpoint.toString(), {
        open_timeout: 5000,
        response_timeout: 10000,
        follow_max: 2,
        parse_response: true
    }, (err, res) => {
        if (err) {
            // Status code zero is used to indicate fetch failure.
            this.emit('stats:fetch', feedId, fetchId, 0);
            callback(err);
            return;
        }

        if (res.statusCode !== 200) {
            this.emit('stats:fetch', feedId, fetchId, res.statusCode);
            callback(new Error(`${baseUrl.hostname} responded with ${res.statusCode}`));
            return;
        }

        getStories.call(this, feedId, feedUrl, callback, fetchId, res.body);

        this.emit('feed:update', feedId, {
            updated: new Date()
        });
    });
};
