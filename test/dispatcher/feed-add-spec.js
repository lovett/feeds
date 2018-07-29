'use strict';

const sqlite3 = require('sqlite3').verbose();
const startup = require('../../dispatcher/startup');
const schema = require('../../dispatcher/schema');
const add = require('../../dispatcher/feed/add');
const get = require('../../dispatcher/feed/get');
const assert = require('assert');
const events = require('events');

describe('feed:add', function() {

    beforeEach(function (done) {
        const self = this;
        this.db = new sqlite3.Database(':memory:');
        this.feedUrl = 'http://example.com/feed.rss';
        this.emitter = new events.EventEmitter();
        this.emitter.unlisten = function () {};
        this.emitter.on('startup', startup);
        this.emitter.on('schema', schema);
        this.emitter.on('feed:add', add);
        this.emitter.on('feed:get', get);
        this.emitter.emit('startup', this.db, () => done());
    });

    afterEach(function () {
        this.db.close();
        this.emitter.removeAllListeners();
    });

    it('adds rows to the feeds tables', function (done) {
        const self = this;

        self.emitter.emit(
            'feed:add',
            [{url: self.feedUrl, title: 'test'}],
            (err, feeds) => {
                assert.strictEqual(err, null);
                assert.strictEqual(feeds.length, 1);

                self.db.get(
                    'SELECT COUNT(*) as count FROM feeds',
                    function (err, row) {
                        if (err) {
                            throw err;
                        }

                        assert.strictEqual(row.count, 1);
                        done();
                    }
                );
            }
        );
    });

    it('populates title with fallback', function (done) {
        const self = this;

        self.emitter.emit(
            'feed:add',
            [{url: 'http://example.org/feed'}],
            (err, feeds) => {
                assert.strictEqual(err, null);
                assert.strictEqual(feeds.length, 1);
                assert.strictEqual(feeds[0].title, 'example.org');

                self.db.get(
                    'SELECT COUNT(*) as count FROM feeds',
                    function (err, row) {
                        if (err) {
                            throw err;
                        }

                        assert.strictEqual(row.count, 1);
                        done();
                    }
                );
            }
        );
    });

    it('prevents duplicates', function (done) {
        const self = this;

        self.db.run(
            'INSERT INTO feeds (url) VALUES (?)',
            [self.feedUrl],
            function (err) {

                if (err) {
                    throw err;
                }

                self.emitter.emit(
                    'feed:add',
                    [{ url: self.feedUrl}],
                    (err, feeds) => {
                        assert.strictEqual(err, null);
                        assert.strictEqual(feeds.length, 1);

                        self.db.get(
                            'SELECT COUNT(*) as count FROM feeds',
                            (err, row) => {
                                if (err) {
                                    throw err;
                                }
                                assert.strictEqual(row.count, 1);
                                done();
                            }
                        );
                    }
                );
            }
        );
    });

    it('handles insert failure', function (done) {
        const self = this;

        self.db.run('DROP TABLE feeds', [], (err) => {
            if (err) {
                throw err;
            }

            self.emitter.emit(
                'feed:add',
                [{url: self.feedUrl, title: 'test'}],
                (err) => {
                    assert(err);
                    done();
                }
            );
        });
    });
});
