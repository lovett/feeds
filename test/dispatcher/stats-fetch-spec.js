'use strict';

const sqlite3 = require('sqlite3').verbose();
const startup = require('../../dispatcher/startup');
const schema = require('../../dispatcher/schema');
const statsFetch = require('../../dispatcher/stats/fetch.js');
const assert = require('assert');
const events = require('events');
const path = require('path');

describe('stats:fetch', function() {

    beforeEach(function (done) {
        const self = this;
        this.schemaRoot = path.join(__dirname, '../../', 'schema');

        this.fetchId = 'fetch';
        this.db = new sqlite3.Database(':memory:');
        this.emitter = new events.EventEmitter();
        this.emitter.unlisten = function () {};
        this.emitter.on('startup', startup);
        this.emitter.on('stats:fetch', statsFetch);
        this.emitter.on('schema', schema);

        this.emitter.emit('startup', this.db, this.schemaRoot, () => {
            self.db.run(
                'INSERT INTO feeds (url) VALUES (?)',
                ['http://example.com/feed.rss'],
                function (err) {
                    if (err) {
                        throw err;
                    }

                    self.feedId = this.lastID;
                    done();
                }
            );
        });
    });

    afterEach(function () {
        this.db.close();
        this.emitter.removeAllListeners();
    });

    it('adds a row to the stats table', function (done) {
        const self = this;
        self.emitter.emit('stats:fetch', self.feedId, self.fetchId, 200, (err, id) => {
            assert.strictEqual(err, null);
            assert.strictEqual(id, 1);
            done();
        });
    });

    it('handles failure to add row', function (done) {
        const self = this;

        self.db.get('DROP TABLE fetchStats', function (err) {
            if (err) {
                throw err;
            }

            self.emitter.emit('stats:fetch', self.feedId, self.fetchId, 200, (err, id) => {
                assert(err);
                assert.strictEqual(id, undefined);
                done();
            });
        });
    });

    it('invokes feed-assess', function (done) {
        const self = this;

        self.emitter.on('feed-assess', (feedId) => {
            assert.strictEqual(feedId, self.feedId);
            done();
        });

        self.emitter.emit('stats:fetch', self.feedId, self.fetchId, 404, () => {});
    });
});
