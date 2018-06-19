'use strict';

const sqlite3 = require('sqlite3').verbose();
const startup = require('../../dispatcher/startup');
const schema = require('../../dispatcher/schema');
const watch = require('../../dispatcher/feed/watch');
const assert = require('assert');
const events = require('events');

describe('feed:watch', function() {

    beforeEach(function (done) {
        const self = this;
        this.db = new sqlite3.Database(':memory:');
        this.feedUrl = 'http://example.com/feed.rss';
        this.emitter = new events.EventEmitter();
        this.emitter.unlisten = function () {};
        this.emitter.on('startup', startup);
        this.emitter.on('schema', schema);
        this.emitter.on('feed:watch', watch);
        this.emitter.on('schema:done', function () {
            self.db.run(
                'INSERT INTO users (username, passwordHash) VALUES ("test", "test")',
                function () {
                    self.userId = this.lastID;
                    done();
                }
            );
        });

        this.emitter.emit('startup', this.db);
    });

    afterEach(function () {
        this.db.close();
        this.emitter.removeAllListeners();
    });

    it('adds rows to the feed and userFeeds tables', function (done) {
        const self = this;

        self.emitter.emit(
            'feed:watch',
            self.userId,
            [{url: self.feedUrl, title: 'test'}],
            (summary) => {
                assert.strictEqual(summary.feedsAdded, 1);
                assert.strictEqual(summary.subscriptionsCreated, 1);

                self.db.get(
                    'SELECT COUNT(*) as count FROM feeds, userFeeds WHERE feeds.id=userFeeds.feedId',
                    function (err, row) {
                        if (err) {
                            throw err;
                        }
                        assert.strictEqual(row.count, 1);
                        done();
                    }
                );
            }
        );
    });

    it('prevents duplicates', function (done) {
        const self = this;

        self.db.run(
            'INSERT INTO feeds (url) VALUES (?)',
            [self.feedUrl],
            function (err) {

                if (err) {
                    throw err;
                }

                self.emitter.emit(
                    'feed:watch',
                    self.userId,
                    [{ url: self.feedUrl}],
                    (result) => {
                        assert.strictEqual(result.feedsAdded, 0);
                        assert.strictEqual(result.subscriptionsCreated, 1);

                        self.db.get(
                            'SELECT COUNT(*) as count FROM feeds',
                            (err, row) => {
                                if (err) {
                                    throw err;
                                }
                                assert.strictEqual(row.count, 1);
                                done();
                            }
                        );
                    }
                );
            }
        );
    });

    it('handles insert failure', function (done) {
        const self = this;

        self.emitter.on('feed:watch:done', (summary) => {
            assert.strictEqual(summary.feedsAdded, 0);
            assert.strictEqual(summary.subscriptionsCreated, 0);
            done();
        });

        self.db.run('DROP TABLE IF EXISTS feeds', [], function (err) {
            if (err) {
                throw err;
            }
            self.emitter.emit(
                'feed:watch',
                self.userId,
                [{url: self.feedUrl, title: 'test'}]
            );
        });
    });
});
