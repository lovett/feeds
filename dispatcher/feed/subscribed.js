/** @module feed/subscribed */
'use strict';

/**
 * Callback for the feed-subscribed event.
 *
 * @callback feedSubscribedCallback
 * @param {error} [err] - Database error.
 * @param {Object[]} [feeds] - List of feeds the user is subscribed to.
 *
 */

/**
 * Get a user's subscribed feeds.
 *
 * Returns most of the fields of the feeds table, but overrides the
 * feed title with the user-specified title if it exists. Also
 * includes the number of unread entries for each feed (relative to
 * the user) and timestamps of the most recent and next fetch.
 *
 * Timestamps are stored in the database as UTC strings but cast to
 * unix epoch integers for client-side convenience.
 *
 * @param {Number} userId - The unique identifier of a user.
 * @param {feedWatchedCallback} callback - A function to invoke on success or failure.
 * @event feed-subscribed
 */
module.exports = function (userId, callback = () => {}) {
    this.db.all(
        `SELECT coalesce(u.title, f.title) as title, f.id, f.url, f.siteUrl,
         count(ue.entryId) as entryCount,
         CAST(strftime('%s', u.created) AS INTEGER) as subscribed,
         CAST(strftime('%s', f.nextFetch) AS INTEGER) as nextFetch,
         (SELECT CAST(strftime('%s', fs.created) AS INTEGER)
          FROM fetchStats fs
          WHERE fs.feedId=f.id
          ORDER BY fs.id DESC LIMIT 1
         ) as fetched
         FROM userFeeds u JOIN feeds f ON u.feedId=f.id
         LEFT JOIN userEntries ue ON u.feedId=ue.feedId AND ue.read=0
         WHERE u.userId=?
         GROUP BY u.feedId
         `,
        [userId],
        function (err, rows) {
            callback(err, rows);
        }
    );
};
