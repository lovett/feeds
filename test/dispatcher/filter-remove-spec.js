'use strict';

const sqlite3 = require('sqlite3').verbose();
const startup = require('../../dispatcher/startup');
const schema = require('../../dispatcher/schema');
const filterRemove = require('../../dispatcher/filter/remove');
const assert = require('assert');
const events = require('events');

describe('filter:remove', function() {

    beforeEach(function (done) {
        const self = this;
        this.db = new sqlite3.Database(':memory:');
        this.emitter = new events.EventEmitter();
        this.emitter.unlisten = function () {};
        this.emitter.on('filter:remove', filterRemove);
        this.emitter.on('startup', startup);
        this.emitter.on('schema', schema);
        this.userId = 1;
        this.filterId = 1;

        this.emitter.on('schema:done', function () {
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

                    self.db.run(
                        'INSERT INTO filters (userId, feedId, value) VALUES (?, ?, ?)',
                        [self.userId, self.feedId, 'test'],
                        (err) => {
                            if (err) {
                                throw filterErr;
                            }
                            done();
                        }
                    );
                });
            });
        });

        self.emitter.emit('startup', self.db);
    });

    afterEach(function () {
        this.db.close();
        this.emitter.removeAllListeners();
    });

    it('deletes a filter', function (done) {
        const self = this;

        self.emitter.on('filter:remove:done', function (filterId) {
            assert.strictEqual(filterId, self.filterId);

            self.db.get('SELECT COUNT(*) as count FROM filters', function (err, row) {
                if (err) {
                    throw err;
                }
                assert.strictEqual(row.count, 0);
                done();
            });
        });

        self.emitter.emit('filter:remove', self.filterId, self.userId);
    });

    it('deletes a filter - callback', function (done) {
        const self = this;

        self.emitter.emit('filter:remove', self.filterId, self.userId, (filterId) => {
            assert.strictEqual(filterId, self.filterId);

            self.db.get('SELECT COUNT(*) as count FROM filters', function (err, row) {
                if (err) {
                    throw err;
                }
                assert.strictEqual(row.count, 0);
                done();
            });
        });
    });

    it('handles deletion failure', function (done) {
        const self = this;

        self.emitter.on('filter:remove:done', function (filterId) {
            assert.strictEqual(filterId, null);
            done();
        });

        self.db.exec('DROP TABLE filters', function (err) {
            if (err) {
                throw err;
            }

            self.emitter.emit('filter:remove', self.filterId, self.userId);
        });
    });

    it('handles deletion failure - callback', function (done) {
        const self = this;

        self.db.exec('DROP TABLE filters', function (err) {
            if (err) {
                throw err;
            }

            self.emitter.emit('filter:remove', self.filterId, self.userId, (filterId) => {
                assert.strictEqual(filterId, null);
                done();
            });
        });
    });


    it('rejects an invalid id', function (done) {
        const self = this;

        self.emitter.on('filter:remove:done', function (filterId) {
            assert.strictEqual(filterId, null);
            done();
        });

        self.emitter.emit('filter:remove', null, self.userId);
    });

    it('rejects an invalid id - callback', function (done) {
        const self = this;

        self.emitter.emit('filter:remove', null, self.userId, (filterId) => {
            assert.strictEqual(filterId, null);
            done();
        });
    });

});
