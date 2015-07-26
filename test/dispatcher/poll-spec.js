var assert, events, poll, setup, sqlite3;

sqlite3 = require('sqlite3').verbose();
setup = require('../../dispatcher/setup');
poll = require('../../dispatcher/poll');
assert = require('assert');
events = require('events');

describe('poll handler', function() {
    'use strict';

    beforeEach(function (done) {
        var self = this;
        this.db = new sqlite3.Database(':memory:');
        this.feedUrl = 'http://example.com/feed.rss';
        this.entryUrl = 'http://example.com/entry.html';
        this.emitter = new events.EventEmitter();
        this.emitter.on('setup', setup);
        this.emitter.on('poll', poll);
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

    it('triggers fetch of a newly added feed', function (done) {
        var self = this;

        self.emitter.on('fetch', function (feedId, feedUrl) {
            assert.strictEqual(feedId, 1);
            assert.strictEqual(feedUrl, self.feedUrl);
            done();
        });

        self.db.run('INSERT INTO feeds (url) VALUES (?)', [self.feedUrl], function (err) {
            if (err) {
                throw err;
            }

            self.db.run('INSERT INTO userFeeds (userId, feedId) VALUES (?, ?)', [self.userId, this.lastID], function (userFeedErr) {
                if (userFeedErr) {
                    throw userFeedErr;
                }

                self.emitter.emit('poll', self.db);
            });
        });
    });

    it('sets the next fetch to a short interval', function (done) {
        var oneMinuteAgo, self;

        oneMinuteAgo = new Date().getTime() / 1000 - 60;
        self = this;

        self.emitter.on('fetch', function (feedId) {

            self.db.get('SELECT count(*) as count FROM feeds WHERE id=? AND nextFetchUtcSeconds IS NOT NULL', [feedId], function (err, row) {
                if (err) {
                    throw err;
                }
                assert.strictEqual(row.count, 1);
                done();
            });
        });

        self.db.run('INSERT INTO feeds (url, nextFetchUtcSeconds) VALUES (?, ?)', [self.feedUrl, oneMinuteAgo], function (err) {
            if (err) {
                throw err;
            }

            self.db.run('INSERT INTO userFeeds (userId, feedId) VALUES (?, ?)', [self.userId, this.lastID], function (userFeedErr) {
                if (userFeedErr) {
                    throw userFeedErr;
                }

                self.emitter.emit('poll', self.db);
            });
        });
    });

    it('emits done event', function (done) {
        var self = this;

        self.emitter.on('poll:done', function (feedId, feedUrl) {
            assert.strictEqual(feedId, 1);
            assert.strictEqual(feedUrl, self.feedUrl);
            done();
        });

        self.db.run('INSERT INTO feeds (url) VALUES (?)', [self.feedUrl], function (err) {
            if (err) {
                throw err;
            }

            self.db.run('INSERT INTO userFeeds (userId, feedId) VALUES (?, ?)', [self.userId, this.lastID], function (userFeedErr) {
                if (userFeedErr) {
                    throw userFeedErr;
                }

                self.emitter.emit('poll', self.db);
            });
        });
    });

    it('handles error when querying for feed', function (done) {
        var self = this;

        self.emitter.on('poll:done', function (feedId, feedUrl) {
            assert(!feedId);
            assert(!feedUrl);
            done();
        });

        self.db.run('DROP TABLE feeds', [], function () {
            self.emitter.emit('poll', self.db);
        });
    });

    it('handles error when querying for most recent feed entry', function (done) {
        var self = this;

        self.emitter.on('log:error', function (message, fields) {
            assert(message);
            assert(fields);
            done();
        });

        self.db.run('INSERT INTO feeds (url) VALUES (?)', [self.feedUrl], function (feedErr) {
            if (feedErr) {
                throw feedErr;
            }

            self.db.run('INSERT INTO userFeeds (userId, feedId) VALUES (?, ?)', [self.userId, this.lastID], function (userFeedErr) {
                if (userFeedErr) {
                    throw userFeedErr;
                }

                self.db.run('DROP TABLE entries', [], function (entryErr) {
                    if (entryErr) {
                        throw entryErr;
                    }
                    self.emitter.emit('poll', self.db);
                });
            });
        });
    });

    it('rechecks an active feed hourly', function (done) {
        var nowSeconds, oneHourFromNow, self, threeHoursFromNow;
        self = this;
        nowSeconds = new Date().getTime() / 1000;
        oneHourFromNow = nowSeconds = 60 * 60;
        threeHoursFromNow = nowSeconds + 60 * 60 * 3;

        self.emitter.on('poll:done', function (feedId, feedUrl, feedNextCheck) {
            assert(feedNextCheck, oneHourFromNow);
            done();
        });

        self.db.serialize(function () {
            var feedId = 1;

            self.db.run('INSERT INTO feeds (url) VALUES (?)', [self.feedUrl]);
            self.db.run('INSERT INTO userFeeds (userId, feedId) VALUES (?, ?)', [self.userId, feedId]);
            self.db.run('INSERT INTO entries (feedId, url, normalizedUrl, title, createdUtcSeconds) VALUES (?, ?, ?, ?, ?)', [feedId, self.entryUrl, self.entryUrl, 'test', threeHoursFromNow], function (entryErr) {
                if (entryErr) {
                    throw entryErr;
                }
                self.emitter.emit('poll', self.db);
            });
        });
    });

    it('rechecks an inactive feed daily', function (done) {
        var nowSeconds, self, yesterdaySeconds;
        self = this;
        nowSeconds = new Date().getTime() / 1000;
        yesterdaySeconds = nowSeconds - 86400;

        self.emitter.on('poll:done', function (feedId, feedUrl, feedNextCheck) {
            assert(feedNextCheck, nowSeconds + 86400);
            done();
        });

        self.db.serialize(function () {
            var feedId = 1;
            self.db.run('INSERT INTO feeds (url) VALUES (?)', [self.feedUrl]);
            self.db.run('INSERT INTO userFeeds (userId, feedId) VALUES (?, ?)', [self.userId, feedId]);
            self.db.run('INSERT INTO entries (feedId, url, normalizedUrl, title, createdUtcSeconds) VALUES (?, ?, ?, ?, ?)', [feedId, self.entryUrl, self.entryUrl, 'test', yesterdaySeconds], function (entryErr) {
                if (entryErr) {
                    throw entryErr;
                }
                self.emitter.emit('poll', self.db);
            });
        });
    });


    it('does not trigger fetch when no feeds are fetchable', function (done) {
        var self = this;

        self.emitter.on('poll:done', function (feedId, feedUrl) {
            assert(!feedId);
            assert(!feedUrl);
            done();
        });

        self.emitter.emit('poll', self.db);
    });

    it('ignores fetchable feed if no users are subscribed to it', function (done) {
        var self = this;

        self.emitter.on('poll:done', function (feedId, feedUrl) {
            assert(!feedId);
            assert(!feedUrl);
            done();
        });

        self.db.run('INSERT INTO feeds (url) VALUES (?)', [self.feedUrl], function (err) {
            if (err) {
                throw err;
            }
            self.emitter.emit('poll', self.db);
        });
    });

});
