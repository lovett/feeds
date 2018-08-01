'use strict';

const sqlite3 = require('sqlite3').verbose();
const startup = require('../../dispatcher/startup');
const schema = require('../../dispatcher/schema');
const watched = require('../../dispatcher/feed/watched');
const assert = require('assert');
const events = require('events');
const path = require('path');

describe('feed-watched', function() {

    beforeEach(function (done) {
        const self = this;
        this.schemaRoot = path.join(__dirname, '../../', 'schema');
        this.fixtureRoot = path.join(__dirname, 'fixtures', 'feed-watched');
        this.db = new sqlite3.Database(':memory:');
        this.feedUrl = 'http://example.com/feed.rss';
        this.emitter = new events.EventEmitter();
        this.emitter.on('startup', startup);
        this.emitter.on('schema', schema);
        this.emitter.on('feed-watched', watched);

        this.emitter.emit('startup', this.db, this.schemaRoot, () => {
            this.emitter.emit('schema', this.fixtureRoot, 2, done);
        });
    });

    afterEach(function () {
        this.db.close();
        this.emitter.removeAllListeners();
    });

    it('handles invalid user id', function (done) {
        this.emitter.emit('feed-watched', 999, (err, feeds) => {
            assert.ifError(err);
            assert.strictEqual(feeds.length, 0);
            done();
        });
    });

    it('handles user with no watched feeds', function (done) {
        const userId = 101;

        this.emitter.emit('feed-watched', userId, (err, feeds) => {
            assert.ifError(err);
            assert.strictEqual(feeds.length, 0);
            done();
        });
    });

    it('provides feed metadata', function (done) {
        const userId = 100;

        this.emitter.emit('feed-watched', userId, (err, feeds) => {
            assert.ifError(err);
            assert.strictEqual(feeds.length, 2);
            assert.strictEqual(feeds[0].title, 'test feed');
            assert.strictEqual(feeds[0].entryCount, 2);
            assert(new Date(feeds[0].fetched));
            assert.strictEqual(feeds[1].entryCount, 0);
            done();
        });
    });

    it('overrides feed title with user value', function (done) {
        const userId = 102;

        this.emitter.emit('feed-watched', userId, (err, feeds) => {
            assert.ifError(err);
            assert.strictEqual(feeds.length, 1);
            assert.strictEqual(feeds[0].title, 'overridden title');
            done();
        });
    });

});
