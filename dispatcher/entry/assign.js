/** @module entry/assign */
'use strict';

/**
 * Callback for the entry-store event.
 *
 * @callback entryAssignedCallback
 * @param {error} [err] - Database error.
 * @param {Number} entryId - The ID of the stored entry.
 * @param {Number} feedId - The ID of the entry's feed.
 *
 */

/**
 * Associate an entry with users subscribed to the entry's feed.
 *
 * @param {Number} entryId - The id of a newly-stored entry.
 * @param {Number} feedIdId - The id of the entry's feed.
 * @param {entryAssignCallback} callback - A function to invoke on success or failure.
 * @fires filter-apply
 * @event entry-assign
 */
module.exports = function (entryId, feedId, callback = () => {}) {
    const self = this;

    self.db.all('SELECT userId from userFeeds WHERE feedId=?', [feedId], function (err, rows) {

        if (err) {
            callback(err);
        }

        for (let i=0; i < rows.length; i++) {
            const row = rows[i];
            const isLast = (i === rows.length - 1);

            self.db.run(
                'INSERT OR IGNORE INTO userEntries (feedId, userId, entryId) VALUES (?, ?, ?)',
                [feedId, row.userId, entryId],
                (err) => {
                    if (err) {
                        callback(err);
                        return;
                    }

                    self.emit('filter-apply', entryId, row.userId);

                    if (isLast) {
                        callback(null, entryId, feedId);
                    }
                }
            );
        }
    });
};
