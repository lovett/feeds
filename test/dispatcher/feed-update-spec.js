var assert, events, feedUpdate, setup, sqlite3;

sqlite3 = require('sqlite3').verbose();
setup = require('../../dispatcher/setup');
feedUpdate = require('../../dispatcher/feed/update');
assert = require('assert');
events = require('events');

describe('feed:update handler', function() {
    'use strict';

    beforeEach(function (done) {
        var self = this;
        this.db = new sqlite3.Database(':memory:');
        this.emitter = new events.EventEmitter();
        this.emitter.on('feed:update', feedUpdate);
        this.emitter.on('setup', setup);
        this.entryUrl = 'http://example.com/entry.html';

        this.emitter.on('setup:done', function () {
            self.db.serialize(function () {
                self.db.run('INSERT INTO feeds (url) VALUES (?)', ['http://example.com/feed.rss']);
                done();
            });
        });

        this.emitter.emit('setup', self.db);

    });

    afterEach(function () {
        this.db.close();
        this.emitter.removeAllListeners();
    });

    it('updates the url field', function (done) {
        var feed, self;

        self = this;
        feed = {
            id: 1,
            url: 'http://example.com/other-url'
        };

        self.emitter.on('feed:update:done', function () {
            self.db.get('SELECT url FROM feeds WHERE id=?', [feed.id], function (err, row) {
                assert.strictEqual(err, null);
                assert.strictEqual(row.url, feed.url);
                done();
            });
        });

        self.emitter.emit('feed:update', self.db, feed);
    });

    it('logs update failure', function (done) {
        var feed, self;

        self = this;
        feed = {
            id: 1,
            url: 'http://example.com/other-url'
        };

        self.emitter.on('log:error', function (message, fields) {
            assert(message);
            assert(fields.error);
            assert(fields.fields);
            done();
        });


        self.db.run('DROP TABLE feeds', function (err) {
            if (err) {
                throw err;
            }
            self.emitter.emit('feed:update', self.db, feed);
        });
    });

});
