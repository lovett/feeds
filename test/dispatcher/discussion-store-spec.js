'use strict';

const sqlite3 = require('sqlite3').verbose();
const startup = require('../../dispatcher/startup');
const schema = require('../../dispatcher/schema');
const discussionStore = require('../../dispatcher/discussion/store');
const assert = require('assert');
const events = require('events');

describe('discussion:store', function() {

    beforeEach(function (done) {
        const self = this;
        this.db = new sqlite3.Database(':memory:');
        this.emitter = new events.EventEmitter();
        this.emitter.unlisten = function () {};
        this.emitter.on('discussion:store', discussionStore);
        this.emitter.on('startup', startup);
        this.emitter.on('schema', schema);
        this.entryUrl = 'http://example.com/entry.html';

        this.emitter.once('schema:done', () => {
            self.db.serialize(function () {
                self.db.run(
                    'INSERT INTO feeds (url) VALUES (?)',
                    ['http://example.com/feed.rss']
                );
                self.db.run(
                    'INSERT INTO entries (feedId, url, guid, title) VALUES (?, ?, ?, ?)',
                    [1, self.entryUrl, self.entryUrl, 'test entry']
                );
                done();
            });
        });

        this.emitter.emit('startup', this.db);
    });

    afterEach(function () {
        this.db.close();
        this.emitter.removeAllListeners();
    });

    it('adds a row to the discussions table', function (done) {
        const self = this;
        const entryId = 1;
        const discussion = {
            commentCount: 1,
            label: 'test',
            url: 'http://example.com/discussion.html'
        };

        self.emitter.once('discussion:store:done', (savedDiscussion) => {
            assert.strictEqual(savedDiscussion.changes, 1);
            assert.strictEqual(savedDiscussion.id, 1);

            self.db.get('SELECT COUNT(*) as count FROM discussions', function (err, row) {
                assert.strictEqual(err, null);
                assert.strictEqual(row.count, 1);
                done();
            });
        });

        self.emitter.emit('discussion:store', entryId, discussion);
    });

    it('requires the label field', function (done) {
        const self = this;
        const entryId = 1;
        const discussion = {
            commentCount: 3,
            url: 'http://example.com/discussion.html'
        };

        self.emitter.once('discussion:store:done', (savedDiscussion) => {
            assert.strictEqual(savedDiscussion, null);
            done();
        });

        self.emitter.emit('discussion:store', entryId, discussion);

    });

    it('requires a valid entry', function (done) {
        const self = this;
        const entryId = 666;
        const discussion = {
            commentCount: 3,
            label: 'test',
            url: 'http://example.com/discussion.html'
        };

        self.emitter.once('discussion:store:done', (savedDiscussion) => {
            assert.strictEqual(savedDiscussion, null);
            done();
        });

        self.emitter.emit('discussion:store', entryId, discussion);

    });


    it('updates an existing row', function (done) {
        const self = this;
        const entryId = 1;
        const discussion = {
            commentCount: 1,
            label: 'test',
            url: 'http://example.com/discussion.html'
        };

        self.emitter.once('discussion:store:done', (savedDiscussion) => {
            assert.strictEqual(savedDiscussion.changes, 1);
            assert.strictEqual(savedDiscussion.id, 1);

            savedDiscussion.commentCount = 100;

            self.emitter.once('discussion:store:done', (savedDiscussion2) => {
                assert.strictEqual(savedDiscussion2.changes, 1);
                assert.strictEqual(savedDiscussion2.id, 1);

                self.db.get('SELECT commentCount FROM discussions LIMIT 1', function (err, row) {
                    assert.strictEqual(err, null);
                    assert.strictEqual(savedDiscussion2.commentCount, savedDiscussion.commentCount);
                    done();
                });
            });

            self.emitter.emit('discussion:store', entryId, discussion);
        });

        self.emitter.emit('discussion:store', entryId, discussion);
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
