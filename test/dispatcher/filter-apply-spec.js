'use strict';

const sqlite3 = require('sqlite3').verbose();
const startup = require('../../dispatcher/startup');
const schema = require('../../dispatcher/schema');
const filterApply = require('../../dispatcher/filter/apply');
const assert = require('assert');
const events = require('events');
const path = require('path');

describe('filter-apply', function() {

    beforeEach(function (done) {
        const schemaRoot = path.join(__dirname, '../../', 'schema');
        const fixtureRoot = path.join(__dirname, 'fixtures', 'filter-apply');
        this.db = new sqlite3.Database(':memory:');
        this.emitter = new events.EventEmitter();
        this.emitter.unlisten = function () {};
        this.emitter.on('filter-apply', filterApply);
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

    it('ignores filter with invalid subject', function (done) {
        const entry = {
            title: 'dog'
        };

        this.emitter.emit('filter-apply', this.userId, this.feedId, entry, (err, result) => {
            const [weight, matchedFilters] = result;
            assert.ifError(err);
            assert.strictEqual(weight, 1);
            assert.strictEqual(matchedFilters.length, 1);
            done();
        });
    });

    it('ignores filter with invalid predicate', function (done) {
        const entry = {
            title: 'dog is not a color'
        };

        this.emitter.emit('filter-apply', this.userId, this.feedId, entry, (err, result) => {
            const [weight, matchedFilters] = result;
            assert.ifError(err);
            assert.strictEqual(weight, 1);
            assert.strictEqual(matchedFilters.length, 1);
            done();
        });
    });

    it('applies the contains predicate', function (done) {
        const entry = {
            title: 'dog bites man'
        };

        this.emitter.emit('filter-apply', this.userId, this.feedId, entry, (err, result) => {
            const [weight, matchedFilters] = result;
            assert.ifError(err);
            assert.strictEqual(weight, 1);
            assert(matchedFilters);
            done();
        });
    });

    it('applies the matches predicate', function (done) {
        const entry = {
            title: 'yellowing is a sign of age'
        };

        this.emitter.emit('filter-apply', this.userId, this.feedId, entry, (err, result) => {
            const [weight, matchedFilters] = result;
            assert.ifError(err);
            assert.strictEqual(weight, 1);
            assert.strictEqual(matchedFilters.length, 1);
            done();
        });
    });

    it('applies the == predicate', function (done) {
        const entry = {
            title: 'hello'
        };

        this.emitter.emit('filter-apply', this.userId, this.feedId, entry, (err, result) => {
            const [weight, matchedFilters] = result;
            assert.ifError(err);
            assert.strictEqual(weight, 1);
            assert.strictEqual(matchedFilters.length, 1);
            done();
        });
    });

    it('applies the > predicate', function (done) {
        const entry = {
            extras: {
                commentCount: 200
            }
        };

        this.emitter.emit('filter-apply', this.userId, this.feedId, entry, (err, result) => {
            const [weight, matchedFilters] = result;
            assert.ifError(err);
            assert.strictEqual(weight, 1);
            assert.strictEqual(matchedFilters.length, 1);
            done();
        });
    });

    it('applies the < predicate', function (done) {
        const entry = {
            extras: {
                commentCount: 10
            }
        };

        this.emitter.emit('filter-apply', this.userId, this.feedId, entry, (err, result) => {
            const [weight, matchedFilters] = result;
            assert.ifError(err);
            assert.strictEqual(weight, 1);
            assert.strictEqual(matchedFilters.length, 1);
            done();
        });
    });

});
