/** @module entry/user-batch-update */
'use strict';

/**
 * Callback for the entry-batch-update event.
 *
 * @callback entryBatchUpdateCallback
 * @param {error} [err] - Database error.
 */

/**
 * Batch-update a user's view of several entries.
 *
 * @param {Number} userId - The id of the user making the update.
 * @param {Number[]} entryIds - A list of entry IDs.
 * @param {Object} props - Keys reflect the schema of the userEntries table.
 * @param {entryBatchUpdateCallback} callback - A function to invoke on success or failure.
 * @event entry-user-batch-update
 */
module.exports = function (userId, entryIds, props, callback = () => {}) {
    const self = this;

    if (entryIds.length === 0) {
        callback(null);
        return;
    }

    const updatableFields = ['read', 'saved', 'score'];

    const sqlPlaceholdersAndValues = Object.keys(props).reduce((accumulator, key) => {
        if (updatableFields.indexOf(key) === -1) {
            return accumulator;
        }

        accumulator.placeholders.push(`${key}=?`);
        accumulator.values.push(props[key]);
        return accumulator;
    }, {placeholders: [], values: []});

    const sqlEntryIdPlaceholders = entryIds.map(id => '?');

    self.db.run(
        `UPDATE userEntries SET ${sqlPlaceholdersAndValues.placeholders.join(',')}
        WHERE userId=? AND entryId IN (${sqlEntryIdPlaceholders.join(',')})`,
        sqlPlaceholdersAndValues.values.concat(userId, entryIds),
        function (err) {
            if (err) {
                callback(err);
                return;
            }

            callback(null);
        }
    );
};
