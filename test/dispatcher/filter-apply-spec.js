var assert, events, filterApply, setup, sqlite3;

sqlite3 = require('sqlite3').verbose();
setup = require('../../dispatcher/setup');
filterApply = require('../../dispatcher/filter/apply');
filterStore = require('../../dispatcher/filter/store');
assert = require('assert');
events = require('events');

describe('filter:apply', function() {
    'use strict';

    beforeEach(function (done) {
        var self = this;
        this.db = new sqlite3.Database(':memory:');
        this.emitter = new events.EventEmitter();
        this.emitter.unlisten = function () {};
        this.emitter.on('filter:apply', filterApply);
        this.emitter.on('filter:store', filterStore);
        this.emitter.on('setup', setup);

        this.emitter.on('setup:done', function () {
            self.db.run('INSERT INTO feeds (url) VALUES (?)', ['http://example.com/feed.rss'], function () {
                self.feedId = this.lastID;

                self.db.run('INSERT INTO users (username, passwordHash) VALUES ("test", "test")', function () {
                    var query, values;

                    self.userId = this.lastID;

                    self.entry = {
                        feedId: self.feedId,
                        fetchid: 'fetch',
                        url: 'http://example.com',
                        normalizedUrl: 'example.com',
                        title: 'the title',
                        extras: {
                            score: 100
                        },
                        userIds: [self.userId]
                    };

                    query = 'INSERT INTO entries (feedId, fetchid, url, normalizedUrl, title, extras) VALUES (?, ?, ?, ?, ?, ?)';
                    values = [self.entry.feedId, self.entry.fetchid, self.entry.url, self.entry.normalizedUrl, self.entry.title, JSON.stringify(self.entry.extras)];
                    self.db.run(query, values, function () {
                        self.entry.id = this.lastID;

                        self.db.run('INSERT INTO userEntries (userId, entryId) VALUES (?, ?)', [self.userId, self.entry.id], function (err) {
                            done();
                        });
                    });
                });
            });
        });

        this.emitter.emit('setup', self.db);

    });

    function storeFilterAndApply(self, filter, callback) {
        self.emitter.once('filter:store:done', function (insertedFilter) {
            self.emitter.emit('filter:apply', self.db, self.entry);
        });

        self.emitter.once('filter:apply:done', function (filterResult) {
            assert.strictEqual(filterResult.user, self.userId);
            assert.strictEqual(filterResult.entryId, self.entry.id);
            assert.strictEqual(filterResult.filterIds[0], 1);

            self.db.get('SELECT score FROM userEntries WHERE userId=? AND entryId=?', [self.userId, self.entry.id], function (err, row) {
                if (err) {
                    throw err;
                }

                assert.strictEqual(row.score, filter.weight);

                if (callback) {
                    callback();
                }
            });

        });

        self.emitter.emit('filter:store', self.db, filter);
    }

    it('applies the contains predicate', function (done) {
        var filter, self;

        self = this;

        self.entry.title = 'dog cat';

        filter = {
            feedId: self.feedId,
            userId: self.userId,
            value: 'title contains cat',
            weight: 100
        };

        storeFilterAndApply(self, filter, done);

    });

    it('applies the excludes predicate', function (done) {
        var filter, self;

        self = this;

        self.entry.title = 'dog cat';

        filter = {
            feedId: self.feedId,
            userId: self.userId,
            value: 'title excludes bird',
            weight: 5
        };

        storeFilterAndApply(self, filter, done);

    });

    it('applies the matches predicate', function (done) {
        var filter, self;

        self = this;

        self.entry.title = 'doggone it';

        filter = {
            feedId: self.feedId,
            userId: self.userId,
            value: 'title matches dog',
            weight: 5
        };

        storeFilterAndApply(self, filter, done);

    });

    it('applies the nomatch predicate', function (done) {
        var filter, self;

        self = this;

        self.entry.title = 'food';

        filter = {
            feedId: self.feedId,
            userId: self.userId,
            value: 'title nomatch foo[tl]',
            weight: 5
        };

        storeFilterAndApply(self, filter, done);

    });

    it('applies the == predicate', function (done) {
        var filter, self;

        self = this;

        self.entry.title = 'food';
        self.entry.discussion = {
            tally: 3
        };

        filter = {
            feedId: self.feedId,
            userId: self.userId,
            value: 'comments == 3',
            weight: 8
        };

        storeFilterAndApply(self, filter, done);

    });

    it('applies the != predicate', function (done) {
        var filter, self;

        self = this;

        self.entry.title = 'food';
        self.entry.discussion = {
            tally: 4
        };

        filter = {
            feedId: self.feedId,
            userId: self.userId,
            value: 'comments != 3',
            weight: 8
        };

        storeFilterAndApply(self, filter, done);

    });

    it('applies the > predicate', function (done) {
        var filter, self;

        self = this;

        self.entry.title = 'food';
        self.entry.discussion = {
            tally: 4
        };

        filter = {
            feedId: self.feedId,
            userId: self.userId,
            value: 'comments > 0',
            weight: 8
        };

        storeFilterAndApply(self, filter, done);

    });

    it('applies the > predicate', function (done) {
        var filter, self;

        self = this;

        self.entry.title = 'food';
        self.entry.discussion = {
            tally: 10
        };

        filter = {
            feedId: self.feedId,
            userId: self.userId,
            value: 'comments < 0',
            weight: 8
        };

        storeFilterAndApply(self, filter, done);

    });

    it('ignores an entry with no users', function (done) {
        var self;

        self = this;

        self.entry.userIds = undefined;


        self.emitter.once('log:trace', function (message, returnedEntry) {
            assert.strictEqual(returnedEntry.userIds, undefined);
            done();
        });

        self.emitter.emit('filter:apply', self.db, self.entry);
    });

    it('ignores an entry with no users', function (done) {
        var self = this;
        self.entry.userIds = undefined;
        self.emitter.once('log:trace', function (message, returnedEntry) {
            assert.strictEqual(returnedEntry.userIds, undefined);
            done();
        });

        self.emitter.emit('filter:apply', self.db, self.entry);
    });

    it('ignores a filter with an unrecognized field', function (done) {
        var filter, self;

        self = this;
        filter = {
            feedId: self.feedId,
            userId: self.userId,
            value: 'nonexistant contains 9',
            weight: 8
        };

        self.emitter.once('log:debug', function (message, returnedFilter) {
            assert(message);
            assert(returnedFilter);
            done();
        });

        storeFilterAndApply(self, filter);
    });

    it('ignores a filter with an unrecognized predicate', function (done) {
        var filter, self;

        self = this;
        filter = {
            feedId: self.feedId,
            userId: self.userId,
            value: 'title suggests food',
            weight: 8
        };

        self.emitter.once('log:debug', function (message, returnedFilter) {
            assert(message);
            assert(returnedFilter);
            done();
        });

        storeFilterAndApply(self, filter);
    });

    it('ignores a filter without a value', function (done) {
        var filter, self;

        self = this;
        filter = {
            feedId: self.feedId,
            userId: self.userId,
            value: 'title contains',
            weight: 8
        };

        self.emitter.once('log:debug', function (message, returnedFilter) {
            assert(message);
            assert(returnedFilter);
            done();
        });

        storeFilterAndApply(self, filter);
    });

    it('ignores a filter without a value', function (done) {
        var filter, self;

        self = this;
        filter = {
            feedId: self.feedId,
            userId: self.userId,
            value: 'title contains',
            weight: 8
        };

        self.emitter.once('log:debug', function (message, returnedFilter) {
            assert(message);
            assert(returnedFilter);
            done();
        });

        storeFilterAndApply(self, filter);
    });

    it('emits nope', function (done) {
        var filter, self;

        self = this;
        filter = {
            feedId: self.feedId,
            userId: self.userId,
            value: 'title contains x',
            weight: 8
        };

        self.emitter.once('filter:apply:nope', function (args) {
            assert(args.filter);
            assert(args.value);
            done();
        });

        self.emitter.once('filter:store:done', function (insertedFilter) {
            self.emitter.emit('filter:apply', self.db, self.entry);
        });


        self.emitter.emit('filter:store', self.db, filter);
    });



    it('handles failure to select filters', function (done) {
        var filter, self;

        self = this;
        filter = {
            feedId: self.feedId,
            userId: self.userId,
            value: 'title contains test',
            weight: 8
        };

        self.emitter.once('filter:store:done', function (insertedFilter) {
            self.db.exec('DROP TABLE filters', function (err) {
                self.emitter.emit('filter:apply', self.db, self.entry);
            });
        });

        self.emitter.once('log:error', function (message, fields) {
            assert(message);
            assert(fields.error);
            done();
        });

        self.emitter.emit('filter:store', self.db, filter);
    });

    it('applies global filters', function (done) {
        var filter, self;

        self = this;
        filter = {
            userId: self.userId,
            value: 'title contains the',
            weight: 8
        };

        storeFilterAndApply(self, filter, done);
    });

    it('handles absence of filters', function (done) {
        var self = this;

        self.emitter.once('log:trace', function (message, fields) {
            assert(message);
            assert(fields.entryId);
            assert(fields.feedId);
            assert(fields.userIds);
            done();
        });

        self.emitter.emit('filter:apply', self.db, self.entry);

    });

    it('handles failure to update userEntries table', function (done) {
        var filter, self;

        self = this;
        filter = {
            feedId: self.feedId,
            userId: self.userId,
            value: 'title contains test',
            weight: 8
        };

        self.emitter.once('filter:store:done', function (insertedFilter) {
            self.db.exec('DROP TABLE userEntries', function () {
                self.emitter.emit('filter:apply', self.db, self.entry);
            });
        });

        self.emitter.once('log:error', function (message, fields) {
            assert(message);
            assert(fields.error);
            done();
        });

        self.emitter.emit('filter:store', self.db, filter);

    });

    it('handles failure to update userEntries table', function (done) {
        var filter, self;

        self = this;
        self.entry.title = 'the title';

        filter = {
            feedId: self.feedId,
            userId: self.userId,
            value: 'title contains title',
            weight: 8
        };

        self.emitter.once('log:error', function (message, fields) {
            assert(message);
            assert(fields.error);
            done();
        });

        self.emitter.once('filter:store:done', function (insertedFilter) {
            self.emitter.emit('filter:apply', self.db, self.entry);
        });

        self.db.exec('DROP TABLE userEntryFilters', function () {
            self.emitter.emit('filter:store', self.db, filter);
        });

    });

    it('lowercases the field name', function (done) {
        var filter, self;

        self = this;

        self.entry.title = 'dog cat';

        filter = {
            feedId: self.feedId,
            userId: self.userId,
            value: 'TITLE contains dog',
            weight: 5
        };

        storeFilterAndApply(self, filter, done);
    });

    it('lowercases the predicate', function (done) {
        var filter, self;

        self = this;

        self.entry.title = 'dog cat';

        filter = {
            feedId: self.feedId,
            userId: self.userId,
            value: 'title CONTAINS dog',
            weight: 5
        };

        storeFilterAndApply(self, filter, done);
    });

    it('treats filter value case-insensitively ', function (done) {
        var filter, self;

        self = this;

        self.entry.title = 'dog cat';

        filter = {
            feedId: self.feedId,
            userId: self.userId,
            value: 'title contains DOG',
            weight: 5
        };

        storeFilterAndApply(self, filter, done);
    });


    afterEach(function () {
        this.db.close();
        this.emitter.removeAllListeners();
    });

});
