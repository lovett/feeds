'use strict';

const sqlite3 = require('sqlite3').verbose();
const startup = require('../../dispatcher/startup');
const schema = require('../../dispatcher/schema');
const watch = require('../../dispatcher/feed/watch');
const assert = require('assert');
const events = require('events');

describe('feed:watch', function() {

    beforeEach(function (done) {
        const self = this;
        this.db = new sqlite3.Database(':memory:');
        this.feedUrl = 'http://example.com/feed.rss';
        this.emitter = new events.EventEmitter();
        this.emitter.unlisten = function () {};
        this.emitter.on('startup', startup);
        this.emitter.on('schema', schema);
        this.emitter.on('feed:watch', watch);
        this.emitter.emit('startup', this.db, () => {
            self.db.serialize(() => {
                self.db.run(
                    'INSERT INTO users (username, passwordHash) VALUES ("test", "test")',
                    function () {
                        self.userId = this.lastID;
                    }
                );

                self.db.run(
                    'INSERT INTO feeds (url, title) VALUES ("http://example.com/feed", "test feed")',
                    function () {
                        self.feedIds = [this.lastID];
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

    it('adds rows to the userFeeds tables', function (done) {
        const self = this;

        self.emitter.emit(
            'feed:watch',
            self.userId,
            self.feedIds,
            (err) => {
                assert.strictEqual(err, null);

                self.db.get(
                    'SELECT COUNT(*) as count FROM userFeeds',
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
});
