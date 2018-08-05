'use strict';

const sqlite3 = require('sqlite3').verbose();
const startup = require('../../dispatcher/startup');
const schema = require('../../dispatcher/schema');
const add = require('../../dispatcher/feed/add');
const assert = require('assert');
const events = require('events');
const path = require('path');

describe('feed-add', function() {

    beforeEach(function (done) {
        const self = this;
        this.schemaRoot = path.join(__dirname, '../../', 'schema');
        this.db = new sqlite3.Database(':memory:');
        this.feedUrl = 'http://example.com/feed.rss';
        this.emitter = new events.EventEmitter();
        this.emitter.on('startup', startup);
        this.emitter.on('schema', schema);
        this.emitter.on('feed-add', add);
        this.emitter.emit('startup', this.db, this.schemaRoot, done);
    });

    afterEach(function () {
        this.db.close();
        this.emitter.removeAllListeners();
    });

    it('adds rows to the feeds tables', function (done) {
        const self = this;

        self.emitter.emit('feed-add', [{url: self.feedUrl}], (err, feedIds) => {
            assert.ifError(err);
            assert.strictEqual(feedIds.length, 1);
            assert.strictEqual(feedIds[0], 1);

            self.db.all('SELECT * FROM feeds', (err, rows) => {
                if (err) {
                    throw err;
                }

                assert.strictEqual(rows.length, 1);
                assert.strictEqual(rows[0].title, 'example.com');
                done();
            });
        });
    });

    it('ignores feeds if no url specified', function (done) {
        const self = this;

        self.emitter.emit('feed-add', [{url: self.feedUrl}, {hello: 'world'}], (err) => {
            assert.ifError(err);

            self.db.all('SELECT * FROM feeds', (err, rows) => {
                if (err) {
                    throw err;
                }

                assert.strictEqual(rows.length, 1);
                done();
            });
        });
    });

    it('handles empty input', function (done) {
        const self = this;

        self.emitter.emit('feed-add', [], (err) => {
            assert(err);

            self.db.all('SELECT * FROM feeds', (err, rows) => {
                if (err) {
                    throw err;
                }

                assert.strictEqual(rows.length, 0);
                done();
            });
        });
    });

    it('prevents duplicates', function (done) {
        const self = this;

        self.emitter.emit('feed-add', [{url: self.feedUrl}, {url: self.feedUrl}], (err, feedIds) => {
            assert.ifError(err);

            assert.strictEqual(feedIds.length, 1);
            assert.strictEqual(feedIds[0], 1);
            self.db.all('SELECT * FROM feeds', (err, rows) => {
                if (err) {
                    throw err;
                }

                assert.strictEqual(rows.length, 1);
                done();
            });
        });
    });
});
