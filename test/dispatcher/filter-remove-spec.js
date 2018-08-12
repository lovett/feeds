'use strict';

const sqlite3 = require('sqlite3').verbose();
const startup = require('../../dispatcher/startup');
const schema = require('../../dispatcher/schema');
const filterRemove = require('../../dispatcher/filter/remove');
const assert = require('assert');
const events = require('events');
const path = require('path');

describe('filter-remove', function() {

    beforeEach(function (done) {
        const self = this;
        const schemaRoot = path.join(__dirname, '../../', 'schema');
        const fixtureRoot = path.join(__dirname, 'fixtures', 'filter-remove');
        this.db = new sqlite3.Database(':memory:');
        this.emitter = new events.EventEmitter();
        this.emitter.on('filter-remove', filterRemove);
        this.emitter.on('startup', startup);
        this.emitter.on('schema', schema);
        this.emitter.emit('startup', this.db, schemaRoot, () => {
            this.emitter.emit('schema', fixtureRoot, 2, done);
        });
        this.userId = 100;
        this.filterId = 400;
    });

    afterEach(function () {
        this.db.close();
        this.emitter.removeAllListeners();
    });

    it('deletes a filter', function (done) {
        this.emitter.emit('filter-remove', this.userId, this.filterId, (err) => {
            assert.ifError(err);

            this.db.get('SELECT COUNT(*) as count FROM filters', (err, row) => {
                assert.strictEqual(row.count, 0);
                done();
            });
        });
    });

    it('rejects an invalid filter id', function (done) {
        this.emitter.emit('filter-remove', this.userId, 99999, (err) => {
            assert.ifError(err);
            done();
        });
    });

    it('rejects an invalid user id', function (done) {
        this.emitter.emit('filter-remove', 99999, this.filterId, (err) => {
            assert.ifError(err);
            done();
        });
    });
});
