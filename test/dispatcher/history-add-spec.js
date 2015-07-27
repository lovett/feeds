var assert, events, historyAdd, setup, sqlite3;

sqlite3 = require('sqlite3').verbose();
setup = require('../../dispatcher/setup');
historyAdd = require('../../dispatcher/history/add.js');
assert = require('assert');
events = require('events');

describe('history:add handler', function() {
    'use strict';

    beforeEach(function (done) {
        var self = this;
        this.feedId = 1;
        this.db = new sqlite3.Database(':memory:');
        this.emitter = new events.EventEmitter();
        this.emitter.on('setup', setup);
        this.emitter.on('history:add', historyAdd);
        this.emitter.on('setup:done', function () {
            self.db.run('INSERT INTO feeds (url) VALUES (?)', ['http://example.com/feed.rss'], function (err) {
                if (err) {
                    throw err;
                }
                done();
            });
        });
        this.emitter.emit('setup', this.db);
    });

    afterEach(function () {
        this.db.close();
        this.emitter.removeAllListeners();
    });

    it('adds a row to the history table', function (done) {
        var itemCount, self;

        self = this;
        itemCount = 10;

        self.emitter.on('history:add:done', function (changes, lastID, err) {
            assert.strictEqual(changes, 1);
            assert.strictEqual(lastID, 1);
            assert.strictEqual(err, null);

            self.db.get('SELECT COUNT(*) as count FROM history', function (dbErr, row) {
                if (dbErr) {
                    throw dbErr;
                }
                assert.strictEqual(row.count, 1);
                done();
            });
        });

        self.emitter.emit('history:add', self.db, 'fetch', self.feedId, 200, itemCount);
    });

    it('handles failure to add row', function (done) {
        var itemCount, self;

        self = this;
        itemCount = 10;

        self.emitter.on('history:add:done', function (changes, lastID, err) {
            assert.strictEqual(changes, undefined);
            assert.strictEqual(lastID, undefined);
            assert(err);
            done();
        });

        self.db.get('DROP TABLE history', function (err) {
            if (err) {
                throw err;
            }
            self.emitter.emit('history:add', self.db, 'fetch', self.feedId, 200, itemCount);
        });
    });
});
