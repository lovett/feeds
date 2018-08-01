'use strict';

const sqlite3 = require('sqlite3').verbose();
const startup = require('../../dispatcher/startup');
const schema = require('../../dispatcher/schema');
const unwatch = require('../../dispatcher/feed/unwatch');
const assert = require('assert');
const events = require('events');
const path = require('path');

describe('feed-unwatch', function() {

    beforeEach(function (done) {
        this.schemaRoot = path.join(__dirname, '../../', 'schema');
        this.fixtureRoot = path.join(__dirname, 'fixtures', 'feed-unwatch');
        this.db = new sqlite3.Database(':memory:');
        this.feedUrl = 'http://example.com/feed.rss';
        this.emitter = new events.EventEmitter();
        this.emitter.on('startup', startup);
        this.emitter.on('schema', schema);
        this.emitter.on('feed-unwatch', unwatch);
        this.userId = 100;
        this.feedId = 200;

        this.emitter.emit('startup', this.db, this.schemaRoot, () => {
            this.emitter.emit('schema', this.fixtureRoot, 2, done);
        });
    });

    afterEach(function () {
        this.db.close();
        this.emitter.removeAllListeners();
    });

    it('handles invalid user id', function (done) {
        this.emitter.emit('feed-unwatch', 999, [1, 2, 3], (err) => {
            assert.ifError(err);
            done();
        });
    });

    it('removed rows from userEntries table via trigger', function (done) {
        this.emitter.emit('feed-unwatch', this.userId, [this.feedId], (err) => {
            assert.ifError(err);

            this.db.get(
                'SELECT COUNT(*) as count from userEntries WHERE userID=?',
                [this.userId],
                (err, row) => {
                    assert.ifError(err);
                    assert.strictEqual(row.count, 0);
                    done();
                }
            );
        });
    });
});
