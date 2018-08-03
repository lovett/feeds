'use strict';

const sqlite3 = require('sqlite3').verbose();
const startup = require('../../dispatcher/startup');
const schema = require('../../dispatcher/schema');
const purge = require('../../dispatcher/feed/purge');
const assert = require('assert');
const events = require('events');
const path = require('path');

describe('feed-purge', function() {

    beforeEach(function (done) {
        const self = this;
        const schemaRoot = path.join(__dirname, '../../', 'schema');
        const fixtureRoot = path.join(__dirname, 'fixtures', 'feed-purge');
        this.db = new sqlite3.Database(':memory:');
        this.feedUrl = 'http://example.com/feed.rss';
        this.emitter = new events.EventEmitter();
        this.emitter.on('startup', startup);
        this.emitter.on('schema', schema);
        this.emitter.on('feed-purge', purge);
        this.emitter.emit('startup', this.db, schemaRoot, () => {
            this.emitter.emit('schema', fixtureRoot, 2, done);
        });
    });

    afterEach(function () {
        this.db.close();
        this.emitter.removeAllListeners();
    });

    it('removes rows from feeds table', function (done) {
        const self = this;

        self.emitter.emit('feed-purge',[{ id: 201}], (err) => {
            assert.ifError(err);

            self.db.get('SELECT count(*) as count FROM feeds WHERE id=201', (err, row) => {
                assert.strictEqual(row.count, 0);
                done();
            });
        });
    });

    it('handles empty list of feed ids', function (done) {
        const self = this;

        self.emitter.emit('feed-purge', [], (err) => {
            assert.ifError(err);

            self.db.get('SELECT COUNT(*) as count FROM feeds', (countErr, row) => {
                assert.ifError(countErr);
                assert.strictEqual(row.count, 5);
                done();
            });
        });
    });

    it('handles non-array value for feed list', function (done) {
        const self = this;

        self.emitter.emit('feed-purge', null, (err) => {
            assert.ifError(err);

            self.db.get('SELECT COUNT(*) as count FROM feeds', (countErr, row) => {
                assert.ifError(countErr);
                assert.strictEqual(row.count, 5);
                done();
            });
        });
    });

    it('handles malformed array for feed list', function (done) {
        const self = this;

        self.emitter.emit('feed-purge', [{'helo': 'world'}], (err) => {
            assert.ifError(err);

            self.db.get('SELECT COUNT(*) as count FROM feeds', (countErr, row) => {
                assert.ifError(countErr);
                assert.strictEqual(row.count, 5);
                done();
            });
        });
    });

    it('causes deletion from userFeeds table', function (done) {
        const self = this;

        self.emitter.emit('feed-purge',[{ id: 201}], (err) => {
            assert.ifError(err);

            self.db.get('SELECT count(*) as count FROM userFeeds WHERE feedId=201', (err, row) => {
                assert.strictEqual(row.count, 0);
                done();
            });
        });
    });

    it('causes deletion from entries table', function (done) {
        const self = this;

        self.emitter.emit('feed-purge',[{ id: 201}], (err) => {
            assert.ifError(err);

            self.db.get('SELECT count(*) as count FROM entries WHERE feedId=201', (err, row) => {
                assert.strictEqual(row.count, 0);
                done();
            });
        });
    });

    it('causes deletion from userEntries table', function (done) {
        const self = this;

        self.emitter.emit('feed-purge',[{ id: 201}], (err) => {
            assert.ifError(err);

            self.db.get('SELECT count(*) as count FROM userEntries WHERE feedId=201', (err, row) => {
                assert.strictEqual(row.count, 0);
                done();
            });
        });
    });
});
