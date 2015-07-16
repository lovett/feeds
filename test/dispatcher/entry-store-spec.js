var sqlite3 = require('sqlite3').verbose();
var setup = require('../../dispatcher/setup');
var entryStore = require('../../dispatcher/entry/store');
var assert = require('assert');
var events = require('events');

describe('entry:store handler', function() {
    beforeEach(function (done) {
        var self = this;
        this.db = new sqlite3.Database(':memory:');
        this.emitter = new events.EventEmitter();
        this.emitter.on('entry:store', entryStore);
        this.emitter.on('setup', setup);

        this.emitter.on('setup:done', function () {
            self.db.run('INSERT INTO feeds (url) VALUES (?)', ['http://example.com/feed.rss'], function (err) {
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
        var self, entry;

        self = this;
        entry = {
            title: 'the title',
            createdUtc: 1,
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

        self.emitter.emit('entry:store', self.db, 1, entry);
    });

    it('blocks duplicate urls', function (done) {
        var self, entry;

        self = this;
        entry = {
            title: 'the title',
            createdUtc: 1,
            url: 'http://example.com/entry1.html'
        };

        self.emitter.emit('entry:store', self.db, 1, entry);

        self.emitter.once('entry:store:done', function (changes, entryId) {
            assert.strictEqual(changes, 1);
            assert.strictEqual(entryId, 1);
            self.emitter.once('entry:store:done', function (changes, entryId) {
                assert.strictEqual(changes, 0);
                assert.strictEqual(entryId, 1);

                self.db.get('SELECT COUNT(*) as count FROM entries', function (err, row) {
                    assert.strictEqual(err, null);
                    assert.strictEqual(row.count, 1);
                    done();
                });
            });
            self.emitter.emit('entry:store', self.db, 1, entry);
        });
    });

    it('requires entry url', function (done) {
        var self, entry;

        self = this;
        entry = {}

        self.emitter.on('log:warn', function (message, fields) {
            assert(message);
            assert(fields);

            self.db.get('SELECT COUNT(*) as count FROM entries', function (err, row) {
                assert.strictEqual(row.count, 0);
                done();
            });
        });

        self.emitter.emit('entry:store', self.db, 1, entry);
    });

    it('requires valid feed ID', function (done) {
        var self, entry;

        self = this;
        entry = {
            url: 'http://example.com'
        }

        self.emitter.on('entry:store:done', function (changes, lastID) {
            assert.strictEqual(changes, undefined);

            self.db.get('SELECT COUNT(*) as count FROM entries', function (err, row) {
                assert.strictEqual(row.count, 0);
                done();
            });
        });

        self.emitter.emit('entry:store', self.db, 999, entry);
    });

    it('emits discussion event', function (done) {
        self = this;
        entry = {
            url: 'http://example.com',
            discussion: {
                'foo': 'bar'
            }
        }

        self.emitter.on('discussion', function (entryId, discussionFields) {
            assert.strictEqual(entryId, 1);
            assert.strictEqual(entry.discussion.foo, discussionFields.foo);
            done();
        });

        self.emitter.emit('entry:store', self.db, 1, entry);
    });

});
