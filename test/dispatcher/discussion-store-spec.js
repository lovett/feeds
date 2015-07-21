var assert, discussionStore, events, setup, sqlite3;

sqlite3 = require('sqlite3').verbose();
setup = require('../../dispatcher/setup');
discussionStore = require('../../dispatcher/discussion/store');
assert = require('assert');
events = require('events');

describe('discussion:store handler', function() {
    'use strict';

    beforeEach(function (done) {
        var self = this;
        this.db = new sqlite3.Database(':memory:');
        this.emitter = new events.EventEmitter();
        this.emitter.on('discussion:store', discussionStore);
        this.emitter.on('setup', setup);

        this.emitter.on('setup:done', function () {
            self.db.serialize(function () {
                self.db.run('INSERT INTO feeds (url) VALUES (?)', ['http://example.com/feed.rss']);
                self.db.run('INSERT INTO entries (feedId, url, title) VALUES (?, ?, ?)', [1, 'http://example.com/entry.rss', 'test entry']);
                done();
            });
        });

        this.emitter.emit('setup', self.db);

    });

    afterEach(function () {
        this.db.close();
        this.emitter.removeAllListeners();
    });

    it('adds a row to the discussions table', function (done) {
        var discussion, self;

        self = this;
        discussion = {
            tally: 1,
            label: 'test',
            url: 'http://example.com/discussion.html'
        };

        self.emitter.on('discussion:store:done', function (changes, lastID) {
            assert.strictEqual(changes, 1);
            assert.strictEqual(lastID, 1);

            self.db.get('SELECT COUNT(*) as count FROM discussions', function (err, row) {
                assert.strictEqual(err, null);
                assert.strictEqual(row.count, 1);
                done();
            });
        });

        self.emitter.emit('discussion:store', self.db, 1, discussion);
    });

    it('updates an existing row', function (done) {
        var discussion, self;

        self = this;
        discussion = {
            tally: 1,
            label: 'test',
            url: 'http://example.com/discussion.html'
        };


        self.emitter.once('discussion:store:done', function (firstChanges, firstDiscussionID) {
            assert.strictEqual(firstChanges, 1);
            assert.strictEqual(firstDiscussionID, 1);

            self.emitter.once('discussion:store:done', function (secondChanges, secondDiscussionID) {
                assert.strictEqual(secondChanges, 1);
                assert.strictEqual(secondDiscussionID, 1);

                self.db.get('SELECT tally FROM discussions LIMIT 1', function (err, row) {
                    assert.strictEqual(err, null);
                    assert.strictEqual(row.tally, discussion.tally);
                    done();
                });
            });

            discussion.tally = 100;
            self.emitter.emit('discussion:store', self.db, 1, discussion);

        });

        self.emitter.emit('discussion:store', self.db, 1, discussion);

    });

});
