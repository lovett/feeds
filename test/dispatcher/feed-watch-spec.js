'use strict';

const sqlite3 = require('sqlite3').verbose();
const startup = require('../../dispatcher/startup');
const schema = require('../../dispatcher/schema');
const watch = require('../../dispatcher/feed/watch');
const assert = require('assert');
const events = require('events');
const path = require('path');

describe('feed-watch', function() {

    beforeEach(function (done) {
        const self = this;
        const schemaRoot = path.join(__dirname, '../../', 'schema');
        const fixtureRoot = path.join(__dirname, 'fixtures', 'feed-watch');
        this.db = new sqlite3.Database(':memory:');
        this.feedUrl = 'http://example.com/feed.rss';
        this.emitter = new events.EventEmitter();
        this.emitter.on('startup', startup);
        this.emitter.on('schema', schema);
        this.emitter.on('feed-watch', watch);
        this.userId = 100;
        this.emitter.emit('startup', this.db, schemaRoot, () => {
            this.emitter.emit('schema', fixtureRoot, 2, done);
        });
    });

    afterEach(function () {
        this.db.close();
        this.emitter.removeAllListeners();
    });

    it('inserts to userFeeds table', function (done) {
        const self = this;

        self.emitter.emit('feed-watch', self.userId, [{ id: 201, title: 'my title'}], (err) => {
            assert.ifError(err);

            self.db.all('SELECT * FROM userFeeds', (selectErr, rows) => {
                assert.ifError(selectErr);
                assert.strictEqual(rows.length, 2);
                assert.strictEqual(rows[1].title, 'my title');
                done();
            });
        });
    });

    it('skips user title when not specified', function (done) {
        const self = this;

        self.emitter.emit('feed-watch', self.userId, [{ id: 201}], (err) => {
            assert.ifError(err);

            self.db.all('SELECT * FROM userFeeds', (selectErr, rows) => {
                assert.ifError(selectErr);
                assert.strictEqual(rows.length, 2);
                assert.strictEqual(rows[1].title, null);
                done();
            });
        });
    });

    it('upserts when re-subscribing', function (done) {
        const self = this;

        self.emitter.emit('feed-watch', self.userId, [{id: 200, title: 'my other title'}], (err) => {
            assert.ifError(err);

            self.db.all('SELECT * FROM userFeeds', (selectErr, rows) => {
                assert.ifError(selectErr);
                assert.strictEqual(rows.length, 1);
                assert.strictEqual(rows[0].title, 'my other title');
                done();
            });
        });
    });


    it('handles empty list of feed ids', function (done) {
        const self = this;

        self.emitter.emit('feed-watch', self.userId, [], (err) => {
            assert.ifError(err);

            self.db.get('SELECT COUNT(*) as count FROM userFeeds', (countErr, row) => {
                assert.ifError(countErr);
                assert.strictEqual(row.count, 1);
                done();
            });
        });
    });

    it('handles non-array value for feed list', function (done) {
        const self = this;

        self.emitter.emit('feed-watch', self.userId, null, (err) => {
            assert.ifError(err);

            self.db.get('SELECT COUNT(*) as count FROM userFeeds', (countErr, row) => {
                assert.ifError(countErr);
                assert.strictEqual(row.count, 1);
                done();
            });
        });
    });

});
