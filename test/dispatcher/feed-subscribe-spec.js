var assert, events, setup, sqlite3, subscribe;

sqlite3 = require('sqlite3').verbose();
setup = require('../../dispatcher/setup');
subscribe = require('../../dispatcher/feed/subscribe');
assert = require('assert');
events = require('events');

describe('feed:subscribe', function() {
    'use strict';

    beforeEach(function (done) {
        var self = this;
        this.db = new sqlite3.Database(':memory:');
        this.feedUrl = 'http://example.com/feed.rss';
        this.emitter = new events.EventEmitter();
        this.emitter.unlisten = function () {};
        this.emitter.on('setup', setup);
        this.emitter.on('feed:subscribe', subscribe);
        this.emitter.on('setup:done', function () {
            self.db.run('INSERT INTO users (username, passwordHash) VALUES ("test", "test")', function () {
                self.userId = this.lastID;
                done();
            });
        });
        this.emitter.emit('setup', this.db);
    });

    afterEach(function () {
        this.db.close();
        this.emitter.removeAllListeners();
    });

    it('adds a row to the feeds table when a user id is not provided', function (done) {
        var self = this;

        self.emitter.on('feed:subscribe:done', function (args) {
            assert.strictEqual(args.changes, 1);
            assert.strictEqual(args.lastId, 1);
            assert.strictEqual(args.error, null);

            self.db.get('SELECT COUNT(*) as count FROM feeds', function (dbErr, row) {
                if (dbErr) {
                    throw dbErr;
                }
                assert.strictEqual(row.count, 1);
                done();
            });
        });

        self.emitter.emit('feed:subscribe', self.db, {url: self.feedUrl});
    });

    it('adds rows to the feed and userFeeds tables', function (done) {
        var self = this;

        self.emitter.on('feed:subscribe:done', function (args) {
            assert.strictEqual(args.changes, 1);
            assert.strictEqual(args.lastId, 1);
            assert.strictEqual(args.error, null);

            self.db.get('SELECT COUNT(*) as count FROM feeds, userFeeds WHERE feeds.id=userFeeds.feedId', function (dbErr, row) {
                if (dbErr) {
                    throw dbErr;
                }
                assert.strictEqual(row.count, 1);
                done();
            });

        });

        self.emitter.emit('feed:subscribe', self.db, {url: self.feedUrl, userId: self.userId});
    });

    it('prevents duplicates', function (done) {
        var self = this;

        self.emitter.on('feed:subscribe:done', function (args) {
            assert.strictEqual(args.changes, 0);
            assert.strictEqual(args.lastId, 1);
            assert.strictEqual(args.error, null);

            self.db.get('SELECT COUNT(*) as count FROM feeds', function (dbErr, row) {
                if (dbErr) {
                    throw dbErr;
                }
                assert.strictEqual(row.count, 1);
                done();
            });
        });

        self.db.run('INSERT INTO feeds (url) VALUES (?)', [self.feedUrl], function () {
            self.emitter.emit('feed:subscribe', self.db, { url: self.feedUrl});
        });


    });

    it('logs feed insert failure', function (done) {
        var self = this;

        self.emitter.on('log:error', function (message, fields) {
            assert(message);
            assert(fields);
            done();
        });

        self.db.run('DROP TABLE IF EXISTS feeds', [], function () {
            self.emitter.emit('feed:subscribe', self.db, {url: self.feedUrl});
        });
    });

    it('logs userFeeds insert failure', function (done) {
        var invalidUserId, self;
        invalidUserId = 2;
        self = this;

        self.emitter.on('log:error', function (message, fields) {
            assert(message);
            assert.strictEqual(fields.user, invalidUserId);
            done();
        });

        self.emitter.emit('feed:subscribe', self.db, {url: self.feedUrl, userId: invalidUserId});
    });

});
