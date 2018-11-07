/** @module entry/user-update */
'use strict';

/**
 * Callback for the entry-update event.
 *
 * @callback entryUpdatedCallback
 * @param {error} [err] - Database error.
 */

/**
 * Update a user's view of an entry.
 *
 * @param {Number} userId - The id of the user making the update.
 * @param {Number} entryId - The id of an existing entry.
 * @param {Object} props - An object whose keys reflect the schema of the userEntries table.
 * @param {entryUpdatedCallback} callback - A function to invoke on success or failure.
 * @event entry-user-update
 */
module.exports = function (userId, entryId, props, callback = () => {}) {
    const self = this;

    const updatableFields = ['read', 'saved', 'score'];

    const sqlPlaceholdersAndValues = Object.keys(props).reduce((accumulator, key) => {
        if (updatableFields.indexOf(key) === -1) {
            return accumulator;
        }

        accumulator.placeholders.push(`${key}=?`);
        accumulator.values.push(props[key]);
        return accumulator;
    }, {placeholders: [], values: []});

    self.db.run(
        `UPDATE userEntries SET ${sqlPlaceholdersAndValues.placeholders.join(',')}
        WHERE userId=? AND entryId=?`,
        sqlPlaceholdersAndValues.values.concat([userId, entryId]),
        function (err) {
            if (err) {
                callback(err);
                return;
            }

            callback(null);
        }
    );
};
