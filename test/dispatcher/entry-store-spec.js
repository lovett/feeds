var assert, entryStore, events, setup, sqlite3;

sqlite3 = require('sqlite3').verbose();
setup = require('../../dispatcher/setup');
entryStore = require('../../dispatcher/entry/store');
assert = require('assert');
events = require('events');

describe('entry:store handler', function() {
    'use strict';

    beforeEach(function (done) {
        var self = this;
        this.feedId = 1;
        this.db = new sqlite3.Database(':memory:');
        this.emitter = new events.EventEmitter();
        this.emitter.on('entry:store', entryStore);
        this.emitter.on('setup', setup);

        this.emitter.on('setup:done', function () {
            self.db.run('INSERT INTO feeds (url) VALUES (?)', ['http://example.com/feed.rss'], function (err) {
                if (err) {
                    throw err;
                }
                done();
            });
        });

        this.emitter.emit('setup', self.db);

    });

    afterEach(function () {
        this.db.close();
        this.emitter.removeAllListeners();
    });

    it('adds a row to the entries table', function (done) {
        var entry, self;

        self = this;
        entry = {
            title: 'the title',
            createdUtc: new Date().getTime(),
            url: 'http://example.com/entry1.html'
        };

        self.emitter.on('entry:store:done', function (changes, lastID) {
            assert.strictEqual(changes, 1);
            assert.strictEqual(lastID, 1);

            self.db.get('SELECT COUNT(*) as count FROM entries', function (err, row) {
                assert.strictEqual(err, null);
                assert.strictEqual(row.count, 1);
                done();
            });
        });

        self.emitter.emit('entry:store', self.db, self.feedId, entry);
    });

    it('blocks duplicate urls', function (done) {
        var entry, self;

        self = this;
        entry = {
            title: 'the title',
            createdUtc: new Date().getTime(),
            url: 'http://example.com/entry1.html'
        };

        self.emitter.emit('entry:store', self.db, self.feedId, entry);

        self.emitter.once('entry:store:done', function (changes, entryId) {
            assert.strictEqual(changes, 1);
            assert.strictEqual(entryId, 1);
            self.emitter.once('entry:store:done', function (secondChanges, secondEntryId) {
                assert.strictEqual(secondChanges, 0);
                assert.strictEqual(secondEntryId, 1);

                self.db.get('SELECT COUNT(*) as count FROM entries', function (err, row) {
                    assert.strictEqual(err, null);
                    assert.strictEqual(row.count, 1);
                    done();
                });
            });
            self.emitter.emit('entry:store', self.db, self.feedId, entry);
        });
    });

    it('requires entry url', function (done) {
        var entry, self;

        self = this;
        entry = {};

        self.emitter.on('log:warn', function (message, fields) {
            assert(message);
            assert(fields);

            self.db.get('SELECT COUNT(*) as count FROM entries', function (err, row) {
                if (err) {
                    throw err;
                }
                assert.strictEqual(row.count, 0);
                done();
            });
        });

        self.emitter.emit('entry:store', self.db, self.feedId, entry);
    });

    it('logs failure to select from entries table', function (done) {
        var entry, self;

        self = this;

        entry = {
            title: 'the title',
            url: 'http://example.com'
        };

        self.emitter.on('log:error', function (message, fields) {
            assert(message);
            assert(fields);
            done();
        });

        self.db.run('DROP TABLE entries', function (err) {
            if (err) {
                throw err;
            }

            self.emitter.emit('entry:store', self.db, self.feedId, entry);
        });
    });

    it('requires valid feed ID', function (done) {
        var entry, self;

        self = this;
        entry = {
            url: 'http://example.com'
        };

        self.emitter.on('entry:store:done', function (changes) {
            assert.strictEqual(changes, undefined);

            self.db.get('SELECT COUNT(*) as count FROM entries', function (err, row) {
                if (err) {
                    throw err;
                }
                assert.strictEqual(row.count, 0);
                done();
            });
        });

        self.emitter.emit('entry:store', self.db, 999, entry);
    });

    it('emits discussion event', function (done) {
        var entry, self;

        self = this;
        entry = {
            url: 'http://example.com',
            discussion: {
                'foo': 'bar'
            }
        };

        self.emitter.on('discussion', function (entryId, discussionFields) {
            assert.strictEqual(entryId, 1);
            assert.strictEqual(entry.discussion.foo, discussionFields.foo);
            done();
        });

        self.emitter.emit('entry:store', self.db, self.feedId, entry);
    });


    it('parses non-numeric creation date', function (done) {
        var entries, self;

        self = this;
        entries = [
            {title: 'title1', url: 'http://example.com/entry1.html', created: 'Sun, 19 Jul 2015 06:51:17 -0500'},
            {title: 'title2', url: 'http://example.com/entry2.html', created: '2015-03-30T11:07:01.441-07:00'},
            {title: 'title3', url: 'http://example.com/entry3.html', created: '2015-06-15T00:00:00Z'},
            {title: 'title4', url: 'http://example.com/entry4.html', created: 'bogus'},
            {title: 'title5', url: 'http://example.com/entry5.html'}
        ];

        entries.forEach(function (entry, index) {
            self.emitter.once('entry:store:done', function (changes, lastID, savedEntry) {
                assert.strictEqual(changes, 1);
                assert(lastID, index + 1);
                assert(savedEntry.createdUtcSeconds);

                if (entry === entries[entries.length - 1]) {
                    done();
                }
            });

            self.emitter.emit('entry:store', self.db, self.feedId, entry);
        });
    });

});
