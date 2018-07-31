'use strict';

const sqlite3 = require('sqlite3').verbose();
const startup = require('../../dispatcher/startup');
const schema = require('../../dispatcher/schema');
const filterStore = require('../../dispatcher/filter/store');
const assert = require('assert');
const events = require('events');
const path = require('path');

describe('filter:store', function() {

    beforeEach(function (done) {
        const self = this;
        this.schemaRoot = path.join(__dirname, '../../', 'schema');
        this.db = new sqlite3.Database(':memory:');
        this.emitter = new events.EventEmitter();
        this.emitter.unlisten = function () {};
        this.emitter.on('filter:store', filterStore);
        this.emitter.on('startup', startup);
        this.emitter.on('schema', schema);

        this.emitter.emit('startup', self.db, this.schemaRoot, () => {
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

        self.emitter.emit('filter:store', self.userId, filter, (err, filter) => {
            assert.strictEqual(err, null);

            self.db.get('SELECT COUNT(*) as count FROM filters', function (err, row) {
                if (err) {
                    throw err;
                }

                assert.strictEqual(row.count, 1);
                done();
            });
       });
    });

    it('adds a global filter', function (done) {
        const self = this;
        const filter = {
            value: 'test'
        };


        self.emitter.emit('filter:store', self.userId, filter, (err, filter) => {
            assert.strictEqual(err, null);

            self.db.get('SELECT count(*) as count FROM filters', function (err, row) {
                if (err) {
                    throw err;
                }
                assert.strictEqual(row.count, 1);
                done();
            });
        });
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

            self.emitter.emit('filter:store', self.userId, filter, (err, insertedFilter) => {
                assert.strictEqual(insertedFilter, null);
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
            filter.value = 'newvalue';

            self.emitter.emit('filter:store', self.userId, filter, (err) => {
                assert.strictEqual(err, null);
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

        self.emitter.emit('filter:store', self.userId, filter, (err) => {
            assert.strictEqual(err, null);

            self.db.run('DROP TABLE filters', function (err) {
                if (err) {
                    throw err;
                }

                self.emitter.emit('filter:store', self.userId, filter, (err) => {
                    assert(err);
                    done();
                });
            });
        });
    });
});
