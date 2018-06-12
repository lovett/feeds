const sqlite3 = require('sqlite3').verbose();
const startup = require('../../dispatcher/startup');
const discussionStore = require('../../dispatcher/discussion/store');
const assert = require('assert');
const events = require('events');

describe('discussion:store', function() {
    'use strict';

    beforeEach(function (done) {
        const self = this;
        this.db = new sqlite3.Database(':memory:');
        this.emitter = new events.EventEmitter();
        this.emitter.unlisten = function () {};
        this.emitter.on('discussion:store', discussionStore);
        this.emitter.on('startup', startup);
        this.entryUrl = 'http://example.com/entry.html';

        this.emitter.on('startup:done', function () {
            self.db.serialize(function () {
                self.db.run('INSERT INTO feeds (url) VALUES (?)', ['http://example.com/feed.rss']);
                self.db.run('INSERT INTO entries (feedId, url, normalizedUrl, title) VALUES (?, ?, ?, ?)', [1, self.entryUrl, self.entryUrl, 'test entry']);
                done();
            });
        });

        this.emitter.emit('startup', self.db);

    });

    afterEach(function () {
        this.db.close();
        this.emitter.removeAllListeners();
    });

    it('adds a row to the discussions table', function (done) {
        const self = this;
        const discussion = {
            entryId: 1,
            tally: 1,
            label: 'test',
            url: 'http://example.com/discussion.html'
        };

        self.emitter.on('discussion:store:done', function (savedDiscussion) {
            assert.strictEqual(savedDiscussion.changes, 1);
            assert.strictEqual(savedDiscussion.id, 1);

            self.db.get('SELECT COUNT(*) as count FROM discussions', function (err, row) {
                assert.strictEqual(err, null);
                assert.strictEqual(row.count, 1);
                done();
            });
        });

        self.emitter.emit('discussion:store', self.db, discussion);
    });

    it('updates an existing row', function (done) {
        const self = this;
        const discussion = {
            entryId: 1,
            tally: 1,
            label: 'test',
            url: 'http://example.com/discussion.html'
        };

        self.emitter.once('discussion:store:done', function (args) {
            assert.strictEqual(args.changes, 1);
            assert.strictEqual(args.id, 1);

            self.emitter.once('discussion:store:done', function (args2) {
                assert.strictEqual(args2.changes, 1);
                assert.strictEqual(args2.id, 1);

                self.db.get('SELECT tally FROM discussions LIMIT 1', function (err, row) {
                    assert.strictEqual(err, null);
                    assert.strictEqual(row.tally, discussion.tally);
                    done();
                });
            });

            discussion.tally = 100;
            self.emitter.emit('discussion:store', self.db, discussion);

        });

        self.emitter.emit('discussion:store', self.db, discussion);

    });

    it('logs insertion failure', function (done) {
        const self = this;

        const discussion = {
            entryId: 1,
            tally: 1,
            label: 'test',
            url: 'http://example.com/discussion.html'
        };

        self.emitter.once('log:error', function (message) {
            assert(message);
            done();
        });

        self.db.run('DROP TABLE discussions', function (err) {
            if (err) {
                throw err;
            }
            self.emitter.emit('discussion:store', self.db, discussion);
        });
    });

});
