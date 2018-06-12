const sqlite3 = require('sqlite3').verbose();
const startup = require('../../dispatcher/startup');
const feedUpdate = require('../../dispatcher/feed/update');
const assert = require('assert');
const events = require('events');

describe('feed:update', function() {
    'use strict';

    beforeEach(function (done) {
        var self = this;
        this.db = new sqlite3.Database(':memory:');
        this.emitter = new events.EventEmitter();
        this.emitter.unlisten = function () {};
        this.emitter.on('feed:update', feedUpdate);
        this.emitter.on('startup', startup);
        this.entryUrl = 'http://example.com/entry.html';

        this.emitter.on('startup:done', function () {
            self.db.serialize(function () {
                self.db.run('INSERT INTO feeds (url) VALUES (?)', ['http://example.com/feed.rss']);
                done();
            });
        });

        this.emitter.emit('startup', self.db);

    });

    afterEach(function () {
        this.db.close();
        this.emitter.removeAllListeners();
    });

    it('updates the url field', function (done) {
        const self = this;
        const feed = {
            id: 1,
            url: 'http://example.com/other-url'
        };

        self.emitter.emit('feed:update', [feed], (err, result) => {
            self.db.get('SELECT url FROM feeds WHERE id=?', [feed.id], function (err, row) {
                assert.strictEqual(err, null);
                assert.strictEqual(row.url, feed.url);
                done();
            });
        });
    });

    it('logs update failure', function (done) {
        const self = this;
        const feed = {
            id: 1,
            url: 'http://example.com/other-url'
        };

        self.emitter.on('log:error', function (message) {
            assert(message);
            done();
        });


        self.db.run('DROP TABLE feeds', function (err) {
            if (err) {
                throw err;
            }
            self.emitter.emit('feed:update', [feed]);
        });
    });

});
