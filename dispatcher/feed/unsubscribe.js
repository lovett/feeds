/** @module feed/unsubscribe */
'use strict';

/**
 * Callback for the feed-unsubscribe event.
 *
 * @callback feedUnsubscribeCallback
 * @param {error} [err] - Database error.
 *
 */

/**
 * Disassociate a user from a feed.
 *
 * Only the userFeeds table is queried. Removals from userEntries table are
 * handled by the userEntries_autodelete trigger.
 *
 * @param {Number} userId - The unique identifier of a user.
 * @param {Number[]} feedIds - A list of feed unique identifiers.
 * @event feed-unsubscribe
 */
module.exports = function (userId, feedIds, callback = () => {}) {
    const placeholders = feedIds.map(() => '?').join(',');

    this.db.all(
        `DELETE FROM userFeeds WHERE userId=? AND feedId IN (${placeholders})`,
        [].concat(userId, feedIds),
        function (err, rows) {
            callback(err);
        }
    );
};
