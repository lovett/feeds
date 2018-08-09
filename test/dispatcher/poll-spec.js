'use strict';

const lolex = require('lolex');
const sqlite3 = require('sqlite3').verbose();
const startup = require('../../dispatcher/startup');
const schema = require('../../dispatcher/schema');
const poll = require('../../dispatcher/feed/poll');
const assert = require('assert');
const events = require('events');
const path = require('path');

describe('poll', function() {

    beforeEach(function (done) {
        const self = this;
        const schemaRoot = path.join(__dirname, '../../', 'schema');
        const fixtureRoot = path.join(__dirname, 'fixtures', 'feed-poll');
        this.db = new sqlite3.Database(':memory:');
        this.emitter = new events.EventEmitter();
        this.emitter.on('feed-poll', poll);
        this.emitter.on('startup', startup);
        this.emitter.on('schema', schema);
        this.userId = 100;
        this.emitter.emit('startup', this.db, schemaRoot, () => {
            this.emitter.emit('schema', fixtureRoot, 2, done);
        });

        this.clock = lolex.install();
    });

    afterEach(function () {
        this.db.close();
        this.emitter.removeAllListeners();
        this.clock.uninstall();
    });

    it('triggers fetch of a newly added feed', function (done) {
        const self = this;


        self.emitter.on('fetch', function (feedId, feedUrl) {
            assert.strictEqual(feedId, 200);
            assert.strictEqual(feedUrl, 'http://example.com/feed.rss');
            done();
        });

        self.emitter.emit('feed-poll', (err) => {
            assert.ifError(err);
        });
    });

    it('invokes a default callback', function (done) {
        const self = this;

        self.emitter.on('fetch', function () {
            done();
        });

        self.emitter.emit('feed-poll');
    });


    it('triggers rescheduling', function (done) {
        const self = this;

        self.emitter.on('feed-reschedule', (feedId) => {
            assert.strictEqual(feedId, 200);
            done();
        });

        self.emitter.emit('feed-poll', (err) => {
            assert.ifError(err);
        });
    });

    it('throws error when nextFeedToFetchView is missing', function (done) {
        const self = this;

        self.db.run('DROP VIEW nextFeedToFetchView', (err) => {
            if (err) {
                throw err;
            }

            self.emitter.emit('feed-poll', (err, feedId) => {
                assert(err);
                done();
            });
        });
    });

    it('invokes callback when nothing is fetchable', function (done) {
        const self = this;

        self.db.run('DELETE FROM FEEDS', (err) => {
            if (err) {
                throw err;
            }

            self.emitter.emit('feed-poll', (err, feedId) => {
                assert.ifError(err);
                assert.strictEqual(feedId, null);
                done();
            });
        });
    });

    it('triggers recursive calling', function (done) {
        const self = this;

        let callCount = 0;

        const numCalls = 4;

        self.emitter.emit('feed-poll', (err, rowId) => {
            callCount++;
            assert.ifError(err);

            if (callCount === numCalls) {
                done();
                return;
            }

            self.clock.next();
        });
    });
});
