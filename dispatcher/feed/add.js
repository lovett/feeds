/** @module feed/add */
'use strict';

const url = require('url');

/**
 * Callback for the feed-add event.
 *
 * @callback feedAddCallback
 * @param {error} [err] - Database error.
 * @param {Number[]} [feedIds] - List of ids for the added or existing URLs.
 */


/**
 * Add a URL to the feeds table.
 *
 * This is a user-agnostic action. Adding a feed does not cause a
 * subscription to be created.
 *
 * Feeds are given a default title derived from URL hostname. This
 * value will be overwritten when the feed is fetched.
 *
 * @param {Object[]} feeds - A list of objects with at least a url property.
 * @param {feedAddCallback} callback - A function to invoke on success or failure.
 * @event feed-add
 */
module.exports = function (feeds, callback) {
    const urls = feeds.reduce((accumulator, feed) => {
        if (feed.url) {
            accumulator.push(feed.url);
        }
        return accumulator;
    }, []);

    if (urls.length === 0) {
        callback(new Error('No feed URLs provided'));
        return;
    }

    const insertPlaceholders = urls.reduce((accumulator) => {
        accumulator.push('(?, ?)');
        return accumulator;
    }, []);

    const values = urls.reduce((accumulator, feedUrl) => {
        const parsedUrl = url.parse(feedUrl);
        accumulator.push(feedUrl);
        accumulator.push(parsedUrl.hostname);
        return accumulator;
    }, []);

    this.db.run(
        `INSERT OR IGNORE INTO feeds (url, title) VALUES ${insertPlaceholders.join(',')}`,
        values,
        (_) => {
            // Insert errors are ignored.

            const selectPlaceholders = urls.map(() => '?').join(',');
            this.db.all(
                `SELECT id FROM feeds WHERE url IN (${selectPlaceholders})`,
                urls,
                (err, rows) => {
                    const ids = rows.map((row) => row.id);
                    callback(err, ids);
                }
            );
        }
    );
};
