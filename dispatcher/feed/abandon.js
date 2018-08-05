/** @module feed/abandon */
'use strict';

/**
 * Callback for the feed-abandon event.
 *
 * @callback feedAbandonCallback
 * @param {error} [err] - Database error.
 */

/**
 * Abandon a feed, causing it to be excluded from subsequent fetching.
 *
 * @param {Number} [feedId] - The unique identifier of the feed to be assessed.
 * @param {feedAbandonCallback} callback - A function to invoke on success or failure.
 * @event feed-abandon
 */
module.exports = function (feedId, callback) {
    this.db.run(
        'UPDATE feeds SET nextFetch=null, abandonned=datetime("now") WHERE id=?',
        [feedId],
        (err) => {
            callback(err);
        }
    );
};
