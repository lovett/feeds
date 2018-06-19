const sqlite3 = require('sqlite3').verbose();
const startup = require('../../dispatcher/startup');
const watch = require('../../dispatcher/feed/watch');
const assert = require('assert');
const events = require('events');

// Temporarily disabled
xdescribe('feed:watch', function() {
    'use strict';

    beforeEach(function (done) {
        const self = this;
        this.db = new sqlite3.Database(':memory:');
        this.feedUrl = 'http://example.com/feed.rss';
        this.emitter = new events.EventEmitter();
        this.emitter.unlisten = function () {};
        this.emitter.on('startup', startup);
        this.emitter.on('feed:watch', watch);
        this.emitter.on('startup:done', function () {
            self.db.run('INSERT INTO users (username, passwordHash) VALUES ("test", "test")', function () {
                self.userId = this.lastID;
                done();
            });
        });
        this.emitter.emit('startup', this.db);
    });

    afterEach(function () {
        this.db.close();
        this.emitter.removeAllListeners();
    });

    it('adds rows to the feed and userFeeds tables', function (done) {
        const self = this;

        self.emitter.emit('feed:watch', self.userId, [{url: self.feedUrl}], (err, result) => {
            assert.strictEqual(err, null);
            assert.strictEqual(result.feedsAdded, 1);

            self.db.get('SELECT COUNT(*) as count FROM feeds, userFeeds WHERE feeds.id=userFeeds.feedId', function (dbErr, row) {
                if (dbErr) {
                    throw dbErr;
                }
                assert.strictEqual(row.count, 1);
                done();
            });
        });
    });

    it('prevents duplicates', function (done) {
        const self = this;

        self.db.run('INSERT INTO feeds (url) VALUES (?)', [self.feedUrl], function () {
            self.emitter.emit('feed:watch', self.userId, [{ url: self.feedUrl}], (err, result) => {
                assert.strictEqual(err, null);
                assert.strictEqual(result.feedsAdded, 0);

                self.db.get('SELECT COUNT(*) as count FROM feeds', function (dbErr, row) {
                    if (dbErr) {
                        throw dbErr;
                    }
                    assert.strictEqual(row.count, 1);
                    done();
                });
            });
        });
    });

    it('logs feed insert failure', function (done) {
        const self = this;

        self.emitter.on('log:error', function (message) {
            assert(message);
            done();
        });

        self.db.run('DROP TABLE IF EXISTS feeds', [], function (err) {
            if (err) {
                throw err;
            }
            self.emitter.emit('feed:watch', self.userId, [{url: self.feedUrl}]);
        });
    });
});
