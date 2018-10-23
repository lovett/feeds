/** @module stats/list */
'use strict';

/**
 * Callback for the stats-by-feed event.
 *
 * @callback statsListCallback
 * @param {error} [err] - Database error.
 * @param {Object[]} rows - A list of objects describing the outcome of a feed fetch.
 */

/**
 * Retrieve fetch stats for a feed.
 *
 * Fetch stats are used in the UI to display the feed history view.
 *
 * @param {Number} feedId - The unique identifier of a feed.
 * @param {statsListCallback} callback - A function to invoke on success or failure.
*/
module.exports = function (feedId, callback = () => {}) {
    this.db.all(
        `SELECT CAST(strftime('%s', fs.created) AS INTEGER) as created,
         fs.httpStatus, count(e.id) as entryCount
         FROM fetchStats fs
         LEFT JOIN entries e ON fs.fetchid=e.fetchid
         WHERE fs.feedId=?
         GROUP BY fs.fetchid
         ORDER BY fs.created DESC`,
        [feedId],
        callback
    );
};
