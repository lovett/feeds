'use strict';

const sqlite3 = require('sqlite3').verbose();
const startup = require('../../dispatcher/startup');
const schema = require('../../dispatcher/schema');
const entries = require('../../dispatcher/feed/entries');
const assert = require('assert');
const events = require('events');
const path = require('path');

describe('feed-entries', function() {

    beforeEach(function (done) {
        const self = this;
        const schemaRoot = path.join(__dirname, '../../', 'schema');
        const fixtureRoot = path.join(__dirname, 'fixtures', 'feed-entries');
        this.db = new sqlite3.Database(':memory:');
        this.emitter = new events.EventEmitter();
        this.userId = 100;
        this.feedId = 200;
        this.emitter.on('startup', startup);
        this.emitter.on('schema', schema);
        this.emitter.on('feed-entries', entries);
        this.emitter.emit('startup', this.db, schemaRoot, (err) => {
            this.emitter.emit('schema', fixtureRoot, 2, done);
        });
    });

    afterEach(function () {
        this.db.close();
        this.emitter.removeAllListeners();
    });

    it('Restricts to unread entries', function (done) {
        this.emitter.emit('feed-entries', this.feedId, this.userId, true, 50, 0, (err, feeds) => {
            assert.ifError(err);
            assert.strictEqual(feeds.length, 2);
            done();
        });
    });

    it('Skips unread-only restriction', function (done) {
        this.emitter.emit('feed-entries', this.feedId, this.userId, false, 50, 0, (err, feeds) => {
            assert.ifError(err);
            assert.strictEqual(feeds.length, 3);
            done();
        });
    });

    it('Restricts by limit and offset', function (done) {
        this.emitter.emit('feed-entries', this.feedId, this.userId, false, 1, 1, (err, feeds) => {
            assert.ifError(err);
            assert.strictEqual(feeds.length, 1);
            done();
        });
    });

});
