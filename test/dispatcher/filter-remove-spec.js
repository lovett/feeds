var assert, events, filterRemove, setup, sqlite3;

sqlite3 = require('sqlite3').verbose();
setup = require('../../dispatcher/setup');
filterRemove = require('../../dispatcher/filter/remove');
assert = require('assert');
events = require('events');

describe('filter:remove handler', function() {
    'use strict';

    beforeEach(function (done) {
        var self = this;
        this.db = new sqlite3.Database(':memory:');
        this.emitter = new events.EventEmitter();
        this.emitter.unlisten = function () {};
        this.emitter.on('filter:remove', filterRemove);
        this.emitter.on('setup', setup);
        this.userId = 1;

        this.emitter.on('setup:done', function () {
            self.db.run('INSERT INTO feeds (url) VALUES (?)', ['http://example.com/feed.rss'], function (err) {
                if (err) {
                    throw err;
                }

                self.feedId = this.lastID;

                self.db.run('INSERT INTO users (username, passwordHash) VALUES ("test", "test")', function (userErr) {
                    if (userErr) {
                        throw userErr;
                    }

                    self.userId = this.lastID;

                    self.db.run('INSERT INTO filters (userId, feedId, value) VALUES (?, ?, ?)', [self.userId, self.feedId, 'test'], function (filterErr) {
                        if (filterErr) {
                            throw filterErr;
                        }
                        done();
                    });
                });
            });
        });

        this.emitter.emit('setup', self.db);

    });

    afterEach(function () {
        this.db.close();
        this.emitter.removeAllListeners();
    });

    it('deletes a row from the filters table', function (done) {
        var filter, self;

        self = this;
        filter = {
            id: 1,
            feedId: self.feedId,
            userId: self.userId,
            value: 'test'
        };

        self.emitter.on('filter:remove:done', function (args) {
            assert.strictEqual(args.feedId, filter.feedId);
            assert.strictEqual(args.userId, filter.userId);
            assert.strictEqual(args.id, filter.id);
            assert.strictEqual(args.removed, true);

            self.db.get('SELECT COUNT(*) as count FROM filters', function (err, row) {
                assert.strictEqual(err, null);
                assert.strictEqual(row.count, 0);
                done();
            });
        });

        self.emitter.emit('filter:remove', self.db, filter);
    });

    it('handles deletion failure', function (done) {
        var filter, self;

        self = this;
        filter = {
            id: 1,
            feedId: self.feedId,
            userId: self.userId,
            value: 'test'
        };

        self.emitter.on('filter:remove:done', function (args) {
            assert.strictEqual(args.removed, false);
            done();
        });

        self.db.exec('DROP TABLE filters', function (err) {
            if (err) {
                throw err;
            }

            self.emitter.emit('filter:remove', self.db, filter);
        });
    });

    it('rejects a filter without an id', function (done) {
        var filter, self;

        self = this;
        filter = {};

        self.emitter.on('filter:remove:done', function (args) {
            assert.strictEqual(args.removed, false);
            done();
        });

        self.emitter.emit('filter:remove', self.db, filter);
    });
});
