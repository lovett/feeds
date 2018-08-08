/** @module feed/get */
'use strict';

const url = require('url');


/**
 * Callback for the feed-get event.
 *
 * @callback feedGetCallback
 * @param {error} [err] - Database error.
 * @param {Object[]} feeds - A list of feed objects whose keys reflect the schema of the feeds table.
 */

/**
 * Retrive information about one or more feeds by their id.
 *
 * @param {Number[]} feedIds - A list of feed primary identifiers.
 * @param {feedGetCallback} callback - A function to call on success or failure.
 * @event feed-get
 */
module.exports = function (feedIds, callback) {
    const self = this;

    const placeholders = feedIds.map(_ => '?').join(',');

    const values = feedIds.map((feed) => {
        if (feed.id) {
            return feed.id;
        }
        return feed;
    });

    self.db.all(
        `SELECT id, url, title, description, siteUrl, created, updated, abandonned, nextFetch
         FROM feeds
         WHERE id in (${placeholders})`,
        values,
        (err, rows) => {
            callback(err, rows);
        }
    );
};
