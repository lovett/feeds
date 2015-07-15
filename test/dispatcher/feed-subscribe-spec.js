var sqlite3 = require('sqlite3').verbose();
var setup = require('../../dispatcher/setup');
var subscribe = require('../../dispatcher/feed/subscribe');
var assert = require('assert');
var events = require('events');

describe('feed:subscribe handler', function() {
    beforeEach(function (done) {
        this.db = new sqlite3.Database(':memory:');
        this.emitter = new events.EventEmitter();
        this.emitter.on('setup', setup);
        this.emitter.on('feed:subscribe', subscribe);
        this.emitter.on('setup:done', done);
        this.emitter.emit('setup', this.db);
    });

    afterEach(function () {
        this.db.close();
        this.emitter.removeAllListeners();
    });

    it('adds a row to the feeds table', function (done) {
        var self = this;

        self.emitter.on('feed:subscribe:done', function (changes, lastID, err) {
            assert.strictEqual(changes, 1);
            assert.strictEqual(lastID, 1);
            assert.strictEqual(err, null);

            self.db.get('SELECT COUNT(*) as count FROM feeds', function (err, row) {
                assert.strictEqual(err, null);
                assert.strictEqual(row.count, 1);
                done();
            });
        });

        self.emitter.emit('feed:subscribe', this.db, 'http://example.com/feed.rss');
    });

    it('prevents duplicates', function (done) {
        var self, feedUrl;

        self = this;
        feedUrl = 'http://example.com/feed.rss';

        self.emitter.on('feed:subscribe:done', function (changes, lastID, err) {
            assert.strictEqual(changes, 0);
            assert.strictEqual(lastID, 1);
            assert.strictEqual(err, null);

            self.db.get('SELECT COUNT(*) as count FROM feeds', function (err, row) {
                assert.strictEqual(err, null);
                assert.strictEqual(row.count, 1);
                done();
            });
        });

        self.db.run('INSERT INTO feeds (url) VALUES (?)', [feedUrl], function () {
            self.emitter.emit('feed:subscribe', self.db, 'http://example.com/feed.rss');
        });


    });

    it('logs failure', function (done) {
        var self = this;

        self.emitter.on('log:error', function (message, origin) {
            assert(message);
            assert(origin);
            done();
        });

        self.db.run('DROP TABLE IF EXISTS feeds', [], function () {
            self.emitter.emit('feed:subscribe', self.db);
        });
    });
});
