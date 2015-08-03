module.exports = function (db, entry) {
    'use strict';

    var aliases, filters, matchedFilters, predicates, self, userScore;

    self = this;
    matchedFilters = [];
    userScore = 0;

    aliases = {
        'comments': entry.discussion.tally
    };

    predicates = {
        'contains': function (needle, haystack) {
            return new RegExp('\\b' + needle + '\\b', 'i').test(haystack);
        },

        'does not contain': function (needle, haystack) {
            return !(new RegExp('\\b' + needle + '\\b', 'i').test(haystack));
        },
        'matches': function (needle, haystack) {
            return new RegExp(needle, 'i').test(haystack);
        },
        'does not match': function (needle, haystack) {
            return !(new RegExp(needle, 'i').test(haystack));
        },
        '>': function (needle, haystack) {
            return parseFloat(needle, 10) > parseFloat(haystack, 10);
        },
        '<': function (needle, haystack) {
            return needle < haystack;
        }
    };

    if (entry.userIds.length === 0) {
        return;
    }

    function applyFilter(filter) {
        var aliasKeys, entryValue, field, filterValue, predicate, words;

        aliasKeys = Object.keys(aliases);
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
        }
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

        filters.forEach(applyFilter);

        db.run('BEGIN');
        entry.userIds.forEach(function (userId) {
            db.run('DELETE FROM userEntryFilters WHERE userId=? AND entryId=?', [userId, entry.Id], function (err) {
                if (err) {
                    self.emit('log:error', 'Failed to delete from userEntryFilters table', {error: err});
                }
            });

            db.run('UPDATE userEntries SET score=? WHERE userId=? AND entryId=?', [userScore, userId, entry.id], function (err) {
                if (err) {
                    self.emit('log:error', 'Failed to update userEntries table', {error: err, user: userId, entry: entry.id, score: userScore});
                }
            });

            matchedFilters.forEach(function (filterId) {
                db.run('INSERT INTO userEntryFilters (userId, entryId, filterId) VALUES (?, ?, ?)', [userId, entry.id, filterId], function (err) {
                    if (err) {
                        self.emit('log:error', 'Failed to insert into userEntryFilters table', {error: err});
                    }
                });
            });
        });
        db.run('COMMIT');

        self.emit('filter:apply:done', {
            userId: entry.userId,
            score: userScore,
            matches: matchedFilters
        });
    });
};
