/** @module stats/fetch */
'use strict';

/**
 * Callback for the stats-fetch event.
 *
 * @callback statsFetchCallback
 * @param {error} [err] - Database error.
 */

/**
 * Record the fetch id and HTTP status of a feed fetch.
 *
 * Knowing this makes it possible to track a feed's liveliness over
 * time.
 *
 * @param {Number} feedId - The unique identifier of a feed.
 * @param {Number} fetchId - The unique identifier of a fetch.
 * @param {Number} httpStatus - The HTTP code that was returned when the feed was requested.
 * @param {statsFetchCallback} callback - A function to invoke on success or failure.
 * @fires feed-assess
*/
module.exports = function (feedId, fetchId, httpStatus, parseFail, callback = () => {}) {
    const self = this;

    self.db.run(
        'INSERT INTO fetchStats (feedId, fetchId, httpStatus, parseFail) VALUES (?, ?, ?, ?)',
        [feedId, fetchId, httpStatus, parseFail],
        function (err) {
            if (httpStatus !== 200 || parseFail !== false) {
                self.emit('feed-assess', feedId);
            }

            callback(err);
        }
    );
};
