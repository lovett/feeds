'use strict';

const sqlite3 = require('sqlite3').verbose();
const startup = require('../../dispatcher/startup');
const schema = require('../../dispatcher/schema');
const abandon = require('../../dispatcher/feed/abandon');
const assert = require('assert');
const events = require('events');
const path = require('path');

describe('feed-purge', function() {

    beforeEach(function (done) {
        const self = this;
        const schemaRoot = path.join(__dirname, '../../', 'schema');
        const fixtureRoot = path.join(__dirname, 'fixtures', 'feed-assess');
        this.db = new sqlite3.Database(':memory:');
        this.feedUrl = 'http://example.com/feed.rss';
        this.emitter = new events.EventEmitter();
        this.emitter.on('startup', startup);
        this.emitter.on('schema', schema);
        this.emitter.on('feed-abandon', abandon);
        this.emitter.emit('startup', this.db, schemaRoot, () => {
            this.emitter.emit('schema', fixtureRoot, 2, done);
        });
    });

    afterEach(function () {
        this.db.close();
        this.emitter.removeAllListeners();
    });

    it('updates the abandoned field in the feeds table', function (done) {
        const self = this;
        const feedId = 202;

        self.emitter.emit('feed-abandon', feedId, (err) => {
            assert.ifError(err);

            self.db.get(
                'SELECT abandonned FROM feeds WHERE id=?',
                [feedId],
                (err, row) => {
                    assert(row.abandonned);
                    done();
                }
            );
        });
    });

    it('updates the nextFetch field in the feeds table', function (done) {
        const self = this;
        const feedId = 202;

        self.emitter.emit('feed-abandon', feedId, (err) => {
            assert.ifError(err);

            self.db.get(
                'SELECT nextFetch FROM feeds WHERE id=?',
                [feedId],
                (err, row) => {
                    assert.strictEqual(row.nextFetch, null);
                    done();
                }
            );
        });
    });

});
