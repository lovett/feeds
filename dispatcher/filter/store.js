/** @module filter/store */
'use strict';

/**
 * Callback for the filter-store event.
 *
 * @callback filterStoreCallback
 * @param {error} [err] - Database error.
 * @param {Number} [filterId] - The unique identifier of the new or updated filter.
 *
 */

/**
 * Store or update a user-specific rule for filtering feed entries.
 *
 * @param {Number} userId - The unique identifier of a user.
 * @param {Number} feedId - The unique identifier of a feed.
 * @param {Object} filter - An object whose fields reflect the schema of the filters table.
 * @param {feedStoreCallback} callback - A function to call on success or failure.
 *
 * @event filter-store
 */
module.exports = function (userId, feedId, filter, callback) {
    const self = this;

    if (filter.id) {
        self.db.run(
            'UPDATE filters SET value=?, weight=?, feedId=? WHERE id=?',
            [filter.value, filter.weight, feedId, filter.id],
            function (err) {
                callback(err, (this)? this.lastID : null);
            }
        );
        return;
    }

    self.db.run(
        'INSERT INTO filters (userId, feedId, value, weight) VALUES (?, ?, ?, ?)',
        [userId, feedId, filter.value, filter.weight],
        function (err) {
            callback(err, (this)? this.lastID : null);
        }
    );
};
