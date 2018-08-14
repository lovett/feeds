'use strict';

const sqlite3 = require('sqlite3').verbose();
const startup = require('../../dispatcher/startup');
const schema = require('../../dispatcher/schema');
const filterStore = require('../../dispatcher/filter/store');
const assert = require('assert');
const events = require('events');
const path = require('path');

describe('filter-store', function() {

    beforeEach(function (done) {
        const self = this;
        const schemaRoot = path.join(__dirname, '../../', 'schema');
        const fixtureRoot = path.join(__dirname, 'fixtures', 'feed-subscribe');
        this.db = new sqlite3.Database(':memory:');
        this.emitter = new events.EventEmitter();
        this.emitter.on('filter-store', filterStore);
        this.emitter.on('startup', startup);
        this.emitter.on('schema', schema);
        this.emitter.emit('startup', this.db, schemaRoot, () => {
            this.emitter.emit('schema', fixtureRoot, 2, done);
        });
        this.userId = 100;
        this.feedId = 200;
    });

    afterEach(function () {
        this.db.close();
        this.emitter.removeAllListeners();
    });

    it('adds a feed-specific filter', function (done) {
        const filter = {
            value: 'test'
        };

        this.emitter.emit('filter-store', this.userId, this.feedId, filter, (err, filterId) => {
            assert.ifError(err);
            assert.strictEqual(filterId, 1);

            this.db.get('SELECT * FROM filters', (err, row) => {
                if (err) {
                    throw err;
                }

                assert.strictEqual(row.userId, this.userId);
                assert.strictEqual(row.feedId, this.feedId);
                assert.strictEqual(row.value, filter.value);
                done();
            });
        });
    });

    it('adds a global filter', function (done) {
        const filter = {
            value: 'test'
        };

        this.emitter.emit('filter-store', this.userId, null, filter, (err, filterId) => {
            assert.ifError(err);
            assert.strictEqual(filterId, 1);

            this.db.get('SELECT * FROM filters', (err, row) => {
                assert.strictEqual(row.userId, this.userId);
                assert.strictEqual(row.feedId, null);
                assert.strictEqual(row.value, filter.value);
                done();
            });
        });
    });

    it('handles insertion failure', function (done) {
        const filter = {
            value: 'test'
        };

        this.db.exec('DROP TABLE filters', (err) => {
            this.emitter.emit('filter-store', this.userId, this.feedId, filter, (err, filterId) => {
                assert.strictEqual(filterId, null);
                done();
            });
        });
    });

    it('updates an existing row', function (done) {
        const filter = {
            value: 'test'
        };

        this.emitter.emit('filter-store', this.userId, this.feedId, filter, (err, filterId) => {
            assert.ifError(err);
            filter.id = filterId;
            filter.value = 'newvalue';

            this.emitter.emit('filter-store', this.userId, this.feedId, filter, (err, filterId) => {
                assert.ifError(err);

                this.db.get('SELECT * FROM filters', (err, row) => {
                    assert.strictEqual(row.userId, this.userId);
                    assert.strictEqual(row.feedId, this.feedId);
                    assert.strictEqual(row.value, filter.value);
                    done();
                });
            });
        });
    });

    it('handles failure to update an existing row', function (done) {
        const filter = {
            value: 'test'
        };

        this.emitter.emit('filter-store', this.userId, this.feedId, filter, (err, filterId) => {
            assert.strictEqual(err, null);
            filter.id = filterId;
            filter.value = 'newvalue2';

            this.db.run('DROP TABLE filters', (err) => {
                this.emitter.emit('filter-store', this.userId, this.feedId, filter, (err, filterId) => {
                    assert.strictEqual(filterId, null);
                    done();
                });
            });
        });
    });
});
