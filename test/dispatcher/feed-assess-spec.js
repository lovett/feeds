'use strict';

const sqlite3 = require('sqlite3').verbose();
const startup = require('../../dispatcher/startup');
const schema = require('../../dispatcher/schema');
const assess = require('../../dispatcher/feed/assess');
const assert = require('assert');
const events = require('events');
const path = require('path');

describe('feed-assess', function() {

    beforeEach(function (done) {
        const self = this;
        const schemaRoot = path.join(__dirname, '../../', 'schema');
        const fixtureRoot = path.join(__dirname, 'fixtures', 'feed-assess');
        this.db = new sqlite3.Database(':memory:');
        this.emitter = new events.EventEmitter();
        this.emitter.on('startup', startup);
        this.emitter.on('schema', schema);
        this.emitter.on('feed-assess', assess);
        this.emitter.emit('startup', this.db, schemaRoot, () => {
            this.emitter.emit('schema', fixtureRoot, 2, done);
        });
    });

    afterEach(function () {
        this.db.close();
        this.emitter.removeAllListeners();
    });

    it('emits feed-abandon event for a feed with three consecutive fetch errors', function (done) {
        const self = this;
        const feedId = 200;

        self.emitter.on('feed-abandon', (id, callback) => {
            done();
        });

        self.emitter.emit('feed-assess', feedId, (err, willAbandon) => {
            assert.ifError(err);
            assert.strictEqual(willAbandon, true);
        });
    });

    it('keeps a feed with less than three consecutive fetch errors', function (done) {
        const self = this;

        const feedId = 201;

        self.emitter.emit('feed-assess', feedId, (err, willAbandon) => {
            assert.ifError(err);
            assert.strictEqual(willAbandon, false);
            done();
        });
    });

});
