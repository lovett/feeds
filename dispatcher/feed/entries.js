/** @module feed/entries */

'use strict';

/**
 * Callback for the feed-entries event.
 *
 * @callback feedEntriesCallback
 * @param {error} [err] - Database error.
 * @param {Object[]} [feeds] - A list of entry objects in reverse chronological order.
 */

/**
 * Get unread entries for a feed relative to a user.
 *
 * One user's view of a feed could be different from another, with
 * respect to which entries are unread and new versus not.
 *
 * @param {Number} feedId - The unique identifier of a feed.
 * @param {Number} userId - The unique identifier of a user.
 * @param {Boolean} unreadOnly - If true, only select unread entries. True by default.
 * @param {Number} limit - The maximum number of entries to retrieve.
 * @param {Number} offset - The number of entries to skip when paginating.
 * @param {feedEntriesCallback} callback - A function to call on success or failure.
 *
 * @event feed-entries
 */
module.exports = function (feedId, userId, unreadOnly, limit, offset, callback) {
    let unreadClause = 'AND ue.read=0';
    if (unreadOnly === false) {
        unreadClause = '';
    }

    this.db.all(
        `SELECT e.id, e.url, e.title, e.author, e.created, e.body, e.extras
         FROM userEntries ue, entries e ON ue.entryId=e.id
         WHERE ue.userId=?
         AND ue.feedId=?
         ${unreadClause}
         ORDER BY e.created DESC
         LIMIT ? OFFSET ?`,
        [userId, feedId, limit, offset],
        (err, rows) => {
            callback(err, rows);
        }
    );
};
