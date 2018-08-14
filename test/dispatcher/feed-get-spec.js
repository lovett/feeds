'use strict';

const sqlite3 = require('sqlite3').verbose();
const startup = require('../../dispatcher/startup');
const schema = require('../../dispatcher/schema');
const get = require('../../dispatcher/feed/get');
const assert = require('assert');
const events = require('events');
const path = require('path');

describe('feed-get', function() {

    beforeEach(function (done) {
        const self = this;
        const schemaRoot = path.join(__dirname, '../../', 'schema');
        const fixtureRoot = path.join(__dirname, 'fixtures', 'feed-get');
        this.db = new sqlite3.Database(':memory:');
        this.feedUrl = 'http://example.com/feed.rss';
        this.emitter = new events.EventEmitter();
        this.emitter.on('startup', startup);
        this.emitter.on('schema', schema);
        this.emitter.on('feed-get', get);
        this.emitter.emit('startup', this.db, schemaRoot, () => {
            this.emitter.emit('schema', fixtureRoot, 2, done);
        });
    });

    afterEach(function () {
        this.db.close();
        this.emitter.removeAllListeners();
    });

    it('locates a feed by its id', function (done) {
        const self = this;

        self.emitter.emit('feed-get', [200], (err, feeds) => {
            assert.ifError(err);
            assert.strictEqual(feeds.length, 1);
            assert.strictEqual(feeds[0].title, 'test feed 1');
            done();
        });
    });

    it('extracts feed ids from objects', function (done) {
        const self = this;

        self.emitter.emit('feed-get', [{id: 200}, 201], (err, feeds) => {
            assert.ifError(err);
            assert.strictEqual(feeds.length, 2);
            done();
        });
    });

    it('handles invalid input', function (done) {
        const self = this;

        self.emitter.emit('feed-get', [{hello: "world"}], (err, feeds) => {
            assert.ifError(err);
            assert.strictEqual(feeds.length, 0);
            done();
        });
    });

});
