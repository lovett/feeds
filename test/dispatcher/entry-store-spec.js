'use strict';

const sqlite3 = require('sqlite3').verbose();
const startup = require('../../dispatcher/startup');
const schema = require('../../dispatcher/schema');
const entryStore = require('../../dispatcher/entry/store');
const assert = require('assert');
const events = require('events');
const path = require('path');

describe('entry-store', function() {

    beforeEach(function (done) {
        const self = this;
        this.schemaRoot = path.join(__dirname, '../../', 'schema');
        this.fetchId = 'testfetch';
        this.db = new sqlite3.Database(':memory:');
        this.emitter = new events.EventEmitter();
        this.emitter.unlisten = function () {};
        this.emitter.on('entry-store', entryStore);
        this.emitter.on('startup', startup);
        this.emitter.on('schema', schema);

        this.emitter.emit('startup', self.db, this.schemaRoot, () => {
            self.db.run(
                'INSERT INTO feeds (url) VALUES (?)',
                ['http://example.com/feed.rss'],
                function (err) {
                    if (err) {
                        throw err;
                    }

                    self.feedId = this.lastID;

                    self.db.run(
                        'INSERT INTO users (username, passwordHash) VALUES ("test", "test")',
                        [],
                        function (userErr) {
                            if (userErr) {
                                throw userErr;
                            }
                            self.userId = this.lastID;

                            self.db.run(
                                'INSERT INTO userFeeds (userId, feedId) VALUES(?, ?)',
                                [self.userId, self.feedId],
                                function (userFeedErr) {
                                    if (userFeedErr) {
                                        throw userFeedErr;
                                    }
                                    done();
                                }
                            );
                        }
                    );
                }
            );
        });
    });

    afterEach(function () {
        this.db.close();
        this.emitter.removeAllListeners();
    });

    it('adds a row to the entries table', function (done) {
        const self = this;
        const entry = {
            title: 'the title',
            author: 'H&#229;kon',
            url: 'http://example.com/entry1.html',
            feedId: self.feedId,
            fetchId: self.fetchId,
            body: 'the body',
            extras: {
                score: 1234,
                keywords: 'keyword1 keyword2'
            }
        };

        self.emitter.emit('entry-store', entry, (err, savedEntry) => {
            assert.strictEqual(savedEntry.changes, 1);
            assert.strictEqual(savedEntry.id, 1);
            assert.strictEqual(savedEntry.author, 'Håkon');
            assert.strictEqual(savedEntry.fetchId, self.fetchId);
            assert.strictEqual(savedEntry.body, entry.body);
            assert.strictEqual(typeof savedEntry.extras, 'string');

            self.db.get('SELECT COUNT(*) as count FROM entries', (err, row) => {
                assert.strictEqual(err, null);
                assert.strictEqual(row.count, 1);
                done();
            });
        });
    });

    it('normalizes the url', function (done) {
        const self = this;
        const entry = {
            title: 'the title',
            createdUtc: new Date().getTime(),
            url: 'http://example.com/entry1.html#whatever',
            feedId: self.feedId,
            fetchId: self.fetchId
        };

        self.emitter.emit('entry-store', entry, (err, savedEntry) => {
            assert.strictEqual(savedEntry.changes, 1);
            assert.strictEqual(savedEntry.id, 1);
            assert(savedEntry.guid);
            assert(savedEntry.fetchId, self.fetchId);
            assert(savedEntry.url);
            assert.notStrictEqual(savedEntry.normalizedUrl, savedEntry.url);
            done();
        });
    });

    it('blocks duplicate urls', function (done) {
        const self = this;

        const entry = {
            title: 'the title',
            createdUtc: new Date().getTime(),
            url: 'http://example.com/entry1.html',
            feedId: self.feedId,
            fetchId: self.fetchId
        };

        self.emitter.emit('entry-store', entry, (err, savedEntry) => {
            assert.strictEqual(savedEntry.changes, 1);
            assert.strictEqual(savedEntry.id, 1);

            self.emitter.emit('entry-store', entry, (err, savedEntry2) => {
                assert.strictEqual(savedEntry2.changes, 0);
                assert.strictEqual(savedEntry2.id, 1);

                self.db.get('SELECT COUNT(*) as count FROM entries', (err, row) => {
                    assert.strictEqual(err, null);
                    assert.strictEqual(row.count, 1);
                    done();
                });
            });
        });
    });

    it('requires entry url', function (done) {
        const self = this;
        const entry = {
            feedId: self.feedId,
            fetchId: self.fetchId
        };

        self.emitter.emit('entry-store', entry, (err) => {
            assert(err);
            self.db.get('SELECT COUNT(*) as count FROM entries', function (err, row) {
                if (err) {
                    throw err;
                }
                assert.strictEqual(row.count, 0);
                done();
            });
        });
    });

    it('logs failure to select from entries table', function (done) {
        const self = this;

        const entry = {
            title: 'the title',
            url: 'http://example.com',
            feedId: self.feedId,
            fetchId: self.fetchId
        };

        self.db.run('DROP TABLE entries', function (err) {
            if (err) {
                throw err;
            }

            self.emitter.emit('entry-store', entry, (err) => {
                assert(err);
                done();
            });
        });
    });

    it('requires valid feed ID', function (done) {
        const self = this;
        const entry = {
            url: 'http://example.com',
            feedId: 999,
            fetchId: self.fetchId
        };

        self.emitter.emit('entry-store', entry, (err) => {
            assert(err);

            self.db.get('SELECT COUNT(*) as count FROM entries', function (err, row) {
                if (err) {
                    throw err;
                }
                assert.strictEqual(row.count, 0);
                done();
            });
        });
    });

    it('emits discussion event', function (done) {
        const self = this;
        const entry = {
            url: 'http://example.com',
            title: 'the title',
            discussion: {
                'foo': 'bar'
            },
            feedId: self.feedId,
            fetchId: self.fetchId
        };

        self.emitter.on('discussion:store', function (id, discussion) {
            assert.strictEqual(discussion.foo, entry.discussion.foo);
            done();
        });

        self.emitter.emit('entry-store', entry, (err) => {
            assert.strictEqual(err, null);
        });
    });

    it('parses non-numeric creation date', function (done) {
        const self = this;
        const entries = [
            {title: 'title1', url: 'http://example.com/entry1.html', created: 'Sun, 19 Jul 2015 06:51:17 -0500'},
            {title: 'title2', url: 'http://example.com/entry2.html', created: '2015-03-30T11:07:01.441-07:00'},
            {title: 'title3', url: 'http://example.com/entry3.html', created: '2015-06-15T00:00:00Z'},
            {title: 'title4', url: 'http://example.com/entry4.html', created: 'bogus'},
            {title: 'title5', url: 'http://example.com/entry5.html'}
        ];


        for (let i=0; i < entries.length; i++) {
            let entry = entries[i];
            let isLast = (i === entries.length - 1);

            entry.feedId = self.feedId;
            entry.fetchId = self.fetchId;
            self.emitter.emit('entry-store', entry, (err, savedEntry) => {
                assert.strictEqual(err, null);
                assert.strictEqual(savedEntry.changes, 1);
                assert(savedEntry.created);
                assert(new Date(savedEntry.created));
                if (savedEntry.title === entries[entries.length - 1].title) {
                    done();
                }
            });
        };
    });

    it('updates the title field of an existing entry', function (done) {
        const self = this;
        const entry = {
            title: 'original title',
            createdUtc: new Date().getTime(),
            url: 'http://example.com/entry1.html',
            feedId: self.feedId,
            fetchId: self.fetchId,
            body: 'the body'
        };

        self.emitter.emit('entry-store', entry, (err, savedEntry) => {
            assert.strictEqual(err, null);
            assert.strictEqual(savedEntry.id, 1);
            assert.strictEqual(savedEntry.changes, 1);
            assert.strictEqual(savedEntry.title, entry.title);

            savedEntry.title = 'updated title';

            self.emitter.emit('entry-store', savedEntry, (err, updatedEntry) => {
                assert.strictEqual(err, null);
                assert.strictEqual(updatedEntry.title, entry.title);

                self.db.get('SELECT title FROM entries WHERE id=?', [updatedEntry.id], (err, row) => {
                    assert.strictEqual(err, null);
                    assert.strictEqual(row.title, updatedEntry.title);
                    done();
                });
            });
        });
    });
});
