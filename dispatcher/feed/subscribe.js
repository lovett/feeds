/** @module feed/subscribe */
'use strict';

/**
 * Callback for the feed-subscribe event.
 *
 * @callback feedWatchCallback
 * @param {error} [err] - Database error.
 *
 */

/**
 * Subscribe a user to one or more feeds.
 *
 * Subscription causes a feed to become eligible for polling.
 *
 * Polling is requested immediately after subscription creation to
 * minimize delay of the initial fetch.
 *
 * @param {Number} userId - The unique identifier of a user.
 * @param {Object[]} feeds - A list of objects with at least a url property.
 * @param {feedWatchCallback} callback - A function to invoke on success or failure.
 * @event feed-subscribe
 *
 */
module.exports = function (userId, feeds=[], callback = () => {}) {
    const self = this;

    if (!feeds || feeds.length === 0) {
        callback(null);
        return;
    }

    const placeholders = feeds.map(() => `(${userId}, ?, ?)`).join(',');

    const values = feeds.reduce((accumulator, feed) => {
        if (!feed.title) {
            feed.title = null;
        }
        return accumulator.concat(feed.id, feed.title, feed.title);
    }, []);

    self.db.run(
        `INSERT INTO userFeeds (userId, feedId, title) VALUES ${placeholders}
         ON CONFLICT (userId, feedId) DO UPDATE SET title=?`,
        values,
        (err) => {

            if (!err) {
                self.emit('feed-poll');
            }

            callback(err);
        }
    );
};
