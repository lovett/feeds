'use strict';

const sqlite3 = require('sqlite3').verbose();
const startup = require('../../dispatcher/startup');
const schema = require('../../dispatcher/schema');
const feedUpdate = require('../../dispatcher/feed/update');
const assert = require('assert');
const events = require('events');

describe('feed:update', function() {

    beforeEach(function (done) {
        const self = this;
        this.entryUrl = 'http://example.com/entry.html';
        this.db = new sqlite3.Database(':memory:');
        this.emitter = new events.EventEmitter();
        this.emitter.unlisten = function () {};
        this.emitter.on('feed:update', feedUpdate);
        this.emitter.on('startup', startup);
        this.emitter.on('schema', schema);

        this.emitter.emit('startup', self.db, () => {
            self.db.serialize(function () {
                self.db.run(
                    'INSERT INTO feeds (url) VALUES (?)',
                    ['http://example.com/feed.rss'],
                    function (err) {
                        if (err) {
                            throw err;
                        }

                        done();
                    }
                );
            });
        });
    });

    afterEach(function () {
        this.db.close();
        this.emitter.removeAllListeners();
    });

    function testFieldUpdate(context, name, value, done) {
        const self = context;
        const feedId = 1;
        let  feedMeta = {};
        feedMeta[name] = value;

        self.emitter.emit(
            'feed:update',
            feedId,
            feedMeta,
            (err, result) => {
                self.db.get(
                    `SELECT ${name}, updated FROM feeds WHERE id=?`,
                    [feedId],
                    (err, row) => {
                        if (err) {
                            throw err;
                        }
                        assert.strictEqual(row[name], value);
                        assert(row.updated);
                        done();
                    }
                );
            }
        );
    }

    it('updates the url field', function (done) {
        testFieldUpdate(this, 'url', 'http://example.com/other-url', done);
    });

    it('updates the siteUrl field', function (done) {
        testFieldUpdate(this, 'siteUrl', 'http://example.com/', done);
    });

    it('updates the description field', function (done) {
        testFieldUpdate(this, 'description', 'test', done);
    });

    it('updates the title field', function (done) {
        testFieldUpdate(this, 'title', 'test', done);
    });

    it('logs update failure', function (done) {
        const self = this;

        self.emitter.on('log:error', (message) => {
            assert(message);
            done();
        });

        self.db.run('DROP TABLE feeds', (err) => {
            if (err) {
                throw err;
            }

            self.emitter.emit('feed:update', 1, {
                url: 'http://example.com/other-url'
            });
        });
    });

    it('rejects invalid feed id', function (done) {
        const self = this;
        const feedId = 'invalid';
        const  feedMeta = {'url': 'http://example.com'};

        self.emitter.emit(
            'feed:update',
            feedId,
            feedMeta,
            (updateCount) => {
                assert.strictEqual(updateCount, 0);
                done();
            }
        );
    });

    it('rejects invalid feed name', function (done) {
        const self = this;
        const feedId = 'invalid';
        const  feedMeta = {'invalid': 'whatever'};

        self.emitter.emit(
            'feed:update',
            feedId,
            feedMeta,
            (updateCount) => {
                assert.strictEqual(updateCount, 0);
                done();
            }
        );
    });

    it('handles transaction commit error', function (done) {
        const self = this;
        const feedId = 1;
        const feedMeta = {'url': 'http://example.com/feed.rss'};

        self.db.run('DROP TABLE feeds', function (err) {
            self.emitter.emit(
                'feed:update',
                feedId,
                feedMeta,
                (updateCount) => {
                    assert.strictEqual(updateCount, 0);
                    done();
                }
            );
        });
    });

});
