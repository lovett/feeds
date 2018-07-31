'use strict';

const sqlite3 = require('sqlite3').verbose();
const startup = require('../../dispatcher/startup');
const schema = require('../../dispatcher/schema');
const poll = require('../../dispatcher/feed/poll');
const assert = require('assert');
const events = require('events');
const path = require('path');

describe('poll', function() {

    beforeEach(function (done) {
        const self = this;
        this.schemaRoot = path.join(__dirname, '../../', 'schema');
        this.db = new sqlite3.Database(':memory:');
        this.feedUrl = 'http://example.com/feed.rss';
        this.entryUrl = 'http://example.com/entry.html';
        this.emitter = new events.EventEmitter();
        this.emitter.unlisten = function () {};
        this.emitter.on('startup', startup);
        this.emitter.on('poll', poll);
        this.emitter.on('schema', schema);

        this.emitter.emit('startup', self.db, this.schemaRoot, () => {
            self.db.run(
                'INSERT INTO users (username, passwordHash) VALUES ("test", "test")',
                function (err) {
                    if (err) {
                        throw err;
                    }
                    self.userId = this.lastID;
                    done();
                }
            );
        });
    });

    afterEach(function () {
        this.db.close();
        this.emitter.removeAllListeners();
    });

    it('triggers fetch of a newly added feed', function (done) {
        const self = this;

        self.emitter.on('fetch', function (feedId, feedUrl) {
            assert.strictEqual(feedId, 1);
            assert.strictEqual(feedUrl, self.feedUrl);
            done();
        });

        self.db.run(
            'INSERT INTO feeds (url) VALUES (?)',
            [self.feedUrl],
            function (err) {
                if (err) {
                    throw err;
                }

                self.db.run(
                    'INSERT INTO userFeeds (userId, feedId) VALUES (?, ?)',
                    [self.userId, this.lastID],
                    (err) => {
                        if (err) {
                            throw err;
                        }

                        self.emitter.emit('poll', true, () => {});
                    }
                );
            }
        );
    });

    it('triggers rescheduling', function (done) {
        const self = this;

        self.emitter.on('feed:reschedule', (feedId) => {
            assert.strictEqual(feedId, 1);
            done();
        });

        self.db.run(
            'INSERT INTO feeds (url, nextFetch) VALUES (?, datetime("now", "-1 minute"))',
            [self.feedUrl],
            function (err) {
                if (err) {
                    throw err;
                }

                self.db.run(
                    'INSERT INTO userFeeds (userId, feedId) VALUES (?, ?)',
                    [self.userId, this.lastID],
                    (userFeedErr) => {
                        if (userFeedErr) {
                            throw userFeedErr;
                        }
                        self.emitter.emit('poll', true, () => {});
                    }
                );
            }
        );
    });

    it('invokes callback when nothing is fetchable', function (done) {
        const self = this;

        self.emitter.emit('poll', true, (err, feedId) => {
            assert.strictEqual(err, undefined);
            assert.strictEqual(feedId, undefined);
            done();
        });
    });

    it('invokes callback with feed id being fetched', function (done) {
        const self = this;

        self.db.run(
            'INSERT INTO feeds (url) VALUES (?)',
            [self.feedUrl],
            function (err) {
                if (err) {
                    throw err;
                }

                self.db.run(
                    'INSERT INTO userFeeds (userId, feedId) VALUES (?, ?)',
                    [self.userId, this.lastID],
                    function (err) {
                        if (err) {
                            throw err;
                        }

                        self.emitter.emit('poll', true, (err, feedId) => {
                            assert.strictEqual(err, null);
                            assert.strictEqual(feedId, 1);
                            done();
                        });
                    }
                );
            }
        );
    });

    it('handles error when querying for feed', function (done) {
        const self = this;

        self.db.run('DROP TABLE feeds', function () {
            self.emitter.emit('poll', true, (err, feedId) => {
                assert(err);
                assert.strictEqual(feedId, undefined);
                done();
            });
        });
    });

});
