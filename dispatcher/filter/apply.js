'use strict';

module.exports = function (entryId, userIds) {

    const self = this;

    if (!userIds || userIds.length == 0) {
        self.emit('log:debug', 'Refusing to filter, entry has no users');
        return;
    }

    let aliases = {};

    let predicates = {
        '==': function (needle, haystack) {
            return needle == haystack;
        },
        '!=': function (needle, haystack) {
            return needle != haystack;
        },
        'contains': function (needle, haystack) {
            return new RegExp('\\b' + needle + '\\b', 'i').test(haystack);
        },

        'excludes': function (needle, haystack) {
            return !(new RegExp('\\b' + needle + '\\b', 'i').test(haystack));
        },
        'matches': function (needle, haystack) {
            return new RegExp(needle, 'i').test(haystack);
        },
        'nomatch': function (needle, haystack) {
            return !(new RegExp(needle, 'i').test(haystack));
        },
        '>': function (needle, haystack) {
            return parseFloat(haystack, 10) > parseFloat(needle, 10);
        },
        '<': function (needle, haystack) {
            return parseFloat(needle, 10) < parseFloat(haystack, 10);
        }
    };


    function applyFilters(filters) {
        var aliasKeys, filterValue, matchedFilters, userScore;

        aliasKeys = Object.keys(aliases);
        userScore = 0;
        matchedFilters = [];

        filters.forEach(function (filter) {
            var entryValue, field, predicate, words;

            words = filter.value.split(' ');
            field = words.shift().toLowerCase();
            predicate = words.shift().toLowerCase();
            filterValue = words.join(' ');

            if (entry.hasOwnProperty(field)) {
                entryValue = entry[field];
            } else if (aliasKeys.indexOf(field) > -1) {
                entryValue = aliases[field];
            } else {
                self.emit('log:debug', 'Unrecognized field and no alias', filter);
                return;
            }

            if (Object.keys(predicates).indexOf(predicate) === -1) {
                self.emit('log:debug', 'Unrecognized predicate', filter);
                return;
            }

            if (!filterValue) {
                self.emit('log:debug', 'Filter has no value', filter);
                return;
            }

            if (predicates[predicate](filterValue, entryValue)) {
                userScore += filter.weight;
                matchedFilters.push(filter.id);
            } else {
                self.emit('filter:apply:nope', {
                    'filter': filter,
                    'value': entryValue
                });
            }
        });

        return {
            score: userScore,
            filters: matchedFilters
        };
    };

    self.db.all(
        'SELECT * FROM entryWithFiltersView WHERE id=?',
        [entryId],
        (err, rows) => {
            if (err) {
                self.emit('log:error', `Failed to select from entry view: ${err.message}`);
                return;
            }

            if (rows.length == 0) {
                return;
            }

            let entry = rows[0];

            let filters = rows.reduce((acc, row) => {
                let filter = {
                    weight: row.weight,
                    value: row.value
                };

                acc.push(filter);
            }, []);

            userIds.forEach(function (userId) {
                var filterResult;

                filterResult = applyFilters(entry, filters);

                db.run(
                    'UPDATE userEntries SET score=? WHERE userId=? AND entryId=?',
                    [filterResult.score, userId, entry.id],
                    (err) => {
                        if (err) {
                            self.emit('log:error', `Failed to update userEntries: ${err.message}`);
                            return;
                        }

                        filterResult.filters.forEach(function (filterId) {
                            db.run(
                                'INSERT OR IGNORE INTO userEntryFilters (userId, entryId, filterId) VALUES (?, ?, ?)',
                                [userId, entry.id, filterId],
                                (err) => {
                                    if (err) {
                                        self.emit(
                                            'log:error',
                                            `Failed to insert into userEntryFilters table: ${err.message}`
                                        );
                                    }
                                }
                            );
                        });
                    }
                );
            });
        }
    );
};
