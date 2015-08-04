module.exports = function (db, entry) {
    'use strict';

    var aliases, filters, predicates, self;

    self = this;

    aliases = {};

    if (entry.discussion) {
        aliases.comments = entry.discussion.tally;
    }

    predicates = {
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

    if (!entry.userIds || entry.userIds.length === 0) {
        self.emit('log:trace', 'Refusing to filter entry with no users', entry);
        return;
    }

    function applyFilters(filters) {
        var aliasKeys, filterValue, matchedFilters, userScore;

        aliasKeys = Object.keys(aliases);
        userScore = 0;
        matchedFilters = [];

        filters.forEach(function (filter) {
            var entryValue, field, predicate, words;

            words = filter.value.split(' ');
            field = words.shift();
            predicate = words.shift();
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


    db.all('SELECT id, value, weight FROM filters WHERE feedId=? AND userId IN (' + entry.userIds.join(',') + ')', [entry.feedId], function (err, filters) {
        if (err) {
            self.emit('log:error', 'Failed to select from filters table', {error: err});
            return;
        }

        if (filters.length === 0) {
            self.emit('log:trace', 'No filters to apply', { entryId: entry.id, feedId: entry.feedId, userIds: entry.userIds});
            return;
        }

        entry.userIds.forEach(function (userId) {
            var filterResult;

            filterResult = applyFilters(filters);


            db.run('UPDATE userEntries SET score=? WHERE userId=? AND entryId=?', [filterResult.score, userId, entry.id], function (err) {
                if (err) {
                    self.emit('log:error', 'Failed to update userEntries table', {error: err});
                    return;
                }

                filterResult.filters.forEach(function (filterId) {
                    db.run('INSERT OR IGNORE INTO userEntryFilters (userId, entryId, filterId) VALUES (?, ?, ?)', [userId, entry.id, filterId], function (err) {
                        if (err) {
                            self.emit('log:error', 'Failed to  into userEntryFilters table', {error: err});
                        }
                    });
                });

                self.emit('filter:apply:done', {
                    user: userId,
                    entryId: entry.id,
                    score: filterResult.score,
                    filterIds: filterResult.filters
                });
            });
        });
    });
};
