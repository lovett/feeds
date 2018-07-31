'use strict';

const sqlite3 = require('sqlite3').verbose();
const startup = require('../../dispatcher/startup');
const schema = require('../../dispatcher/schema');
const filterApply = require('../../dispatcher/filter/apply');
const filterStore = require('../../dispatcher/filter/store');
const assert = require('assert');
const events = require('events');
const path = require('path');

describe('filter:apply', function() {

    beforeEach(function (done) {
        var self = this;
        this.schemaRoot = path.join(__dirname, '../../', 'schema');
        this.db = new sqlite3.Database(':memory:');
        this.emitter = new events.EventEmitter();
        this.emitter.unlisten = function () {};
        this.emitter.on('filter:apply', filterApply);
        this.emitter.on('filter:store', filterStore);
        this.emitter.on('startup', startup);
        this.emitter.on('schema', schema);

        this.emitter.emit('startup', self.db, this.schemaRoot, () => {
            self.db.run(
                'INSERT INTO feeds (url) VALUES (?)',
                ['http://example.com/feed.rss'],
                function () {
                    self.feedId = this.lastID;

                    self.db.run(
                        'INSERT INTO users (username, passwordHash) VALUES ("test", "test")',
                        function (err) {
                            if (err) {
                                throw err;
                            }

                            self.userId = this.lastID;

                            self.entry = {
                                feedId: self.feedId,
                                fetchid: 'fetch',
                                url: 'http://example.com',
                                guid: 'myguid',
                                title: 'dog cat',
                                extras: {
                                    score: 100
                                },
                                userIds: [self.userId]
                            };

                            self.db.run(
                                'INSERT INTO entries (feedId, fetchid, url, guid, title, extras) VALUES (?, ?, ?, ?, ?, ?)',
                                [
                                    self.entry.feedId,
                                    self.entry.fetchid,
                                    self.entry.url,
                                    self.entry.guid,
                                    self.entry.title,
                                    JSON.stringify(self.entry.extras)
                                ],
                                function (err) {
                                    if (err) {
                                        throw err;
                                    }
                                    self.entry.id = this.lastID;
                                    self.db.run(
                                        'INSERT INTO userEntries (userId, feedId, entryId) VALUES (?, ?, ?)',
                                        [self.userId, self.feedId, self.entry.id],
                                        function (err) {
                                            if (err) {
                                                throw err;
                                            }
                                            done();
                                        }
                                    );
                                }
                            );
                        }
                    );
                }
            );
        });
    });

    function storeFilterAndApply(context, filter, done) {
        const self = context;

        self.emitter.emit('filter:store', self.userId, filter, (err, storedFilter) => {
            assert.strictEqual(err, null);
            assert(storedFilter);

            self.emitter.emit('filter:apply', self.entry.id, [self.userId], () => {
                self.db.get(
                    'SELECT score FROM userEntries WHERE userId=? AND entryId=?',
                    [self.userId, self.entry.id],
                    function (err, row) {
                        if (err) {
                            throw err;
                        }
                        assert.strictEqual(err, null);
                        assert.strictEqual(row.score, filter.weight);
                        done();
                    }
                );
            });
        });
    }

    it('applies the contains predicate', function (done) {
        const self = this;

        const filter = {
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

    xit('applies the == predicate', function (done) {
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

    xit('applies the != predicate', function (done) {
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

    xit('applies the > predicate', function (done) {
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

    xit('applies the > predicate', function (done) {
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

    xit('ignores an entry with no users', function (done) {
        var self;

        self = this;

        self.entry.userIds = undefined;


        self.emitter.once('log:trace', function (message, returnedEntry) {
            assert.strictEqual(returnedEntry.userIds, undefined);
            done();
        });

        self.emitter.emxit('filter:apply', self.db, self.entry);
    });

    xit('ignores an entry with no users', function (done) {
        var self = this;
        self.entry.userIds = undefined;
        self.emitter.once('log:trace', function (message, returnedEntry) {
            assert.strictEqual(returnedEntry.userIds, undefined);
            done();
        });

        self.emitter.emxit('filter:apply', self.db, self.entry);
    });

    xit('ignores a filter with an unrecognized field', function (done) {
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

    xit('ignores a filter with an unrecognized predicate', function (done) {
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

    xit('ignores a filter without a value', function (done) {
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

    xit('ignores a filter without a value', function (done) {
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

    it('handles failure to select filters', function (done) {
        var filter, self;

        self = this;
        filter = {
            feedId: self.feedId,
            userId: self.userId,
            value: 'title contains test',
            weight: 8
        };

        self.emitter.once('log:error', function (message, fields) {
            assert(message);
            assert(fields.error);
            done();
        });

        self.emitter.emit('filter:store', self.userId, filter, function (err, storedFilter) {
            self.db.exec('DROP TABLE filters', function (err) {
                self.emitter.emit('filter:apply', self.entry.id, [self.userId], (err) => {
                    assert(err);
                    done();
                });
            });
        });
    });

    it('applies global filters', function (done) {
        var filter, self;

        self = this;
        filter = {
            userId: self.userId,
            value: 'title contains dog',
            weight: 8
        };

        storeFilterAndApply(self, filter, done);
    });

    it('lowercases the field name', function (done) {
        var filter, self;

        self = this;

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
