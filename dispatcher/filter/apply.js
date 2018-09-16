/** @module filter/apply */
'use strict';

/**
 * Callback for the filter-apply event.
 *
 * @callback filterStoreCallback
 * @param {error} [err] - Database error.
 * @param {Number} score - The sum of all matching filter weights.
 */

/**
 * Apply a user's filters to a feed entry.
 *
 * @param {Number} userId - The unique identifier of a user.
 * @param {Number} feedId - The unique identifier of a feed.
 * @param {Object} entry - An object whose fields reflect the schema of the entries table.
 * @param {filterApplyCallback} callback - A function to call on success or failure.
 *
 * @event filter-apply
 */
module.exports = function (userId, feedId, entry, callback = () => {}) {
    const aliases = {
        comments: function () {
            const extras = entry.extras || {};
            return extras.commentCount || null;
        }
    };

    const predicates = {
        '==': function (needle, haystack) {
            return needle == haystack;
        },

        'contains': function (needle, haystack) {
            return new RegExp('\\b' + needle + '\\b', 'i').test(haystack);
        },

        'matches': function (needle, haystack) {
            return new RegExp(needle, 'i').test(haystack);
        },

        '>': function (needle, haystack) {
            return parseFloat(haystack, 10) > parseFloat(needle, 10);
        },

        '<': function (needle, haystack) {
            return parseFloat(haystack, 10) < parseFloat(needle, 10);
        }
    };

    function score(filter, entry) {
        const words = filter.value.split(' ');
        const subject = words.shift().toLowerCase();
        const predicate = words.shift().toLowerCase();
        const value = words.join(' ');
        const defaultScore = [0, null];

        if (!predicates.hasOwnProperty(predicate)) {
            return defaultScore;
        }

        if (aliases.hasOwnProperty(subject)) {
            if (predicates[predicate](value, aliases[subject]())) {
                return [filter.weight, filter.id];
            }
        }

        if (!entry.hasOwnProperty(subject) && !aliases.hasOwnProperty(subject)) {
            return defaultScore;
        }


        if (predicates[predicate](value, entry[subject])) {
            return [filter.weight, filter.id];
        }

        return defaultScore;
    };

    this.db.all(
        `SELECT id, value, weight
         FROM filters
         WHERE Userid=? And (FeedId=? OR feedId IS NULL)`,
        [userId, feedId],
        (err, rows) => {
            const result = rows.reduce((accumulator, row) => {
                let [weight, filterId] = score(row, entry);
                accumulator[0] += weight;
                if (filterId) {
                    accumulator[1].push(filterId);
                }
                return accumulator;
            }, [0, []]);

            callback(err, result);
        }
    );
};
