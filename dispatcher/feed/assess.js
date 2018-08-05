/** @module feed/assess */
'use strict';

/**
 * Callback for the feed-assess event.
 *
 * @callback feedAssessCallback
 * @param {error} [err] - Database error.
 * @param {Boolean} willAbandon - Whether the feed is slated for abandonment.
 */

/**
 * Determine whether a feed should be abandonned.
 *
 * A feed is abandoned  if the last three fetches have returned
 * with a status of 400 or greater.
 *
 * @param {Number} [feedId] - The unique identifier of the feed to be assessed.
 * @param {feedAssessCallback} callback - A function to invoke on success or failure.
 * @event feed-assess
 */
module.exports = function (feedId, callback = () => {}) {
    const threshold = 3;

    this.db.get(
        `SELECT count(*) as count
         FROM fetchStats
         WHERE id IN (
             SELECT id FROM fetchStats WHERE feedId=?
             ORDER BY created DESC LIMIT ${threshold}
         )
         AND httpStatus >= 400`,
        [feedId],
        (err, row) => {
            if (row.count === threshold) {
                this.emit('feed-abandon', feedId);
                callback(err, true);
                return;
            }
            callback(err, false);
        }
    );
};
