'use strict';

const sqlite3 = require('sqlite3').verbose();
const startup = require('../../dispatcher/startup');
const schema = require('../../dispatcher/schema');
const watched = require('../../dispatcher/feed/watched');
const assert = require('assert');
const events = require('events');
const path = require('path');

describe('feed:watched', function() {

    beforeEach(function (done) {
        const self = this;
        this.schemaRoot = path.join(__dirname, '../../', 'schema');
        this.db = new sqlite3.Database(':memory:');
        this.feedUrl = 'http://example.com/feed.rss';
        this.emitter = new events.EventEmitter();
        this.emitter.unlisten = function () {};
        this.emitter.on('startup', startup);
        this.emitter.on('schema', schema);
        this.emitter.on('feed:watched', watched);
        this.emitter.emit('startup', this.db, this.schemaRoot, () => {
            self.db.serialize(() => {
                self.db.run(
                    'INSERT INTO users (username, passwordHash) VALUES ("test", "test")',
                    function () {
                        self.userId = this.lastID;
                    }
                );
                self.db.run(
                    'INSERT INTO feeds (url, title) VALUES (?, "example.com")',
                    [self.feedUrl],
                    function () {
                        self.feedId = this.lastID;
                    }
                );

                self.db.run(
                    'INSERT INTO userFeeds (userId, feedId) VALUES (2, 1)',
                    [self.user, self.feedId],
                    function (err) {
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

    it('lists subscribed feeds with unread entry count', function (done) {
        const self = this;

        self.emitter.emit(
            'feed:watched',
            self.userId,
            (err, feeds) => {
                assert.strictEqual(err, null);
                assert.strictEqual(feeds[0].title, 'example.com');
                assert.strictEqual(feeds[0].entryCount, 0);
                done();
            }
        );
    });
});
