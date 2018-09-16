/** @module filter/remove */
'use strict';

/**
 * Callback for the filter-remove event.
 *
 * @callback filterStoreCallback
 * @param {error} [err] - Database error.
 */

/**
 * Discard a previously-added filter.
 *
 * @param {Number} userId - The unique identifier of a user.
 * @param {Number} filterId - The unique identifier of a filter.
 * @param {feedRemoveCallback} callback - a function to call on success or failure.
 *
 * @event filter-remove
 */
module.exports = function (userId, filterId, callback = () => {}) {

    this.db.run(
        'DELETE FROM filters WHERE id=? AND userID=?',
        [filterId, userId],
        callback
    );
};
