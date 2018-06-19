'use strict';

const sqlite3 = require('sqlite3').verbose();
const startup = require('../../dispatcher/startup');
const schema = require('../../dispatcher/schema');
const filterStore = require('../../dispatcher/filter/store');
const assert = require('assert');
const events = require('events');

describe('filter:store', function() {

    beforeEach(function (done) {
        const self = this;
        this.db = new sqlite3.Database(':memory:');
        this.emitter = new events.EventEmitter();
        this.emitter.unlisten = function () {};
        this.emitter.on('filter:store', filterStore);
        this.emitter.on('startup', startup);
        this.emitter.on('schema', schema);

        this.emitter.on('schema:done', () => {
            self.db.run(
                'INSERT INTO feeds (url) VALUES (?)',
                ['http://example.com/feed.rss'],
                (err) => {
                    if (err) {
                        throw err;
                    }

                    self.feedId = this.lastID;

                    self.db.run(
                        'INSERT INTO users (username, passwordHash) VALUES ("test", "test")',
                        function () {
                            self.userId = this.lastID;
                            done();
                        }
                    );
                }
            );
        });

        this.emitter.emit('startup', self.db);

    });

    afterEach(function () {
        this.db.close();
        this.emitter.removeAllListeners();
    });

    it('adds a feed-specific filter', function (done) {
        const self = this;

        const filter = {
            feedId: self.feedId,
            value: 'test'
        };

        self.emitter.on('filter:store:done', (filter) => {
            assert.strictEqual(filter.id, 1);

            self.db.get('SELECT COUNT(*) as count FROM filters', function (err, row) {
                if (err) {
                    throw err;
                }
                assert.strictEqual(row.count, 1);
                done();
            });
        });

        self.emitter.emit('filter:store', self.userId, filter);
    });

    it('adds a global filter', function (done) {
        const self = this;
        const filter = {
            value: 'test'
        };

        self.emitter.on('filter:store:done', function (filter) {
            assert.strictEqual(filter.id, 1);

            self.db.get('SELECT count(*) as count FROM filters', function (err, row) {
                if (err) {
                    throw err;
                }
                assert.strictEqual(row.count, 1);
                done();
            });
        });

        self.emitter.emit('filter:store', self.userId, filter);
    });

    it('handles insertion failure', function (done) {
        const self = this;
        const filter = {
            feedId: self.feedId,
            userId: self.userId,
            value: 'test'
        };

        self.db.exec('DROP TABLE filters', function (err) {
            if (err) {
                throw err;
            }

            self.emitter.emit('filter:store', self.userId, filter, (insertedFilter) => {
                assert.strictEqual(insertedFilter, undefined);
                done();
            });
        });
    });

    it('updates an existing row', function (done) {
        const self = this;
        const filter = {
            feedId: self.feedId,
            userId: self.userId,
            value: 'test'
        };

        self.emitter.emit('filter:store', self.userId, filter, (insertedFilter) => {
            insertedFilter.value = 'newvalue';

            self.emitter.emit('filter:store', self.userId, insertedFilter, (updatedFilter) => {
                assert.strictEqual(updatedFilter.value, insertedFilter.value);
                done();
            });
        });
    });

    it('handles failure to update an existing row', function (done) {
        const self = this;
        const filter = {
            feedId: self.feedId,
            value: 'test'
        };

        self.emitter.emit('filter:store', self.userId, filter, (insertedFilter) => {
            self.db.run('DROP TABLE filters', function (err) {
                if (err) {
                    throw err;
                }

                self.emitter.emit('filter:store', self.userId, insertedFilter, (updatedFilter) => {
                    assert.strictEqual(updatedFilter, undefined);
                    done();
                });
            });
        });
    });
});
