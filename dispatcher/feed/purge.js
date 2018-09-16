/** @module feed/purge */
'use strict';

/**
 * Callback for the feed-purge event.
 *
 * @callback feedPurgeCallback
 * @param {error} [err] - Database error.
 *
 */

/**
 * Remove a feed from the database and all subscriptions to it.
 *
 * @param {Object[]} feeds - A list of objects with at least an id property.
 * @param {feedPurgeCallback} callback - A function to invoke on success or failure.
 * @event feed-purge
 */
module.exports = function (feeds, callback = () => {}) {

    if (!feeds || feeds.length === 0) {
        callback(null);
        return;
    }

    const placeholders = feeds.map(() => '?').join(',');

    const values = feeds.reduce((accumulator, feed) => {
        if (feed.id) {
            accumulator.push(feed.id);
        }
        return accumulator;
    }, []);


    this.db.run(
        `DELETE FROM feeds WHERE id IN (${placeholders})`,
        values, (err) => callback(err)
    );
};
