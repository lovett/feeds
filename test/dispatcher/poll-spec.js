var sqlite3 = require('sqlite3').verbose();
var setup = require('../../dispatcher/setup');
var poll = require('../../dispatcher/poll');
var assert = require('assert');
var events = require('events');

describe('poll handler', function() {
    beforeEach(function (done) {
        this.db = new sqlite3.Database(':memory:');
        this.emitter = new events.EventEmitter();
        this.emitter.on('setup', setup);
        this.emitter.on('poll', poll);
        this.emitter.on('setup:done', done);
        this.emitter.emit('setup', this.db);
    });

    afterEach(function () {
        this.db.close();
        this.emitter.removeAllListeners();
    });

    it('triggers fetch of a newly added feed', function (done) {
        var self, testUrl;
        self = this;
        testUrl = 'http://example.com/feed.rss';

        self.emitter.on('fetch', function (db, feedId, feedUrl) {
            assert.strictEqual(feedId, 1);
            assert.strictEqual(feedUrl, testUrl);
            done();
        });

        self.db.run('INSERT INTO feeds (url) VALUES (?)', [testUrl], function (err) {
            self.emitter.emit('poll', self.db);
        });
    });

    it('updates nextFetchUtc field', function (done) {
        var self, testUrl;
        self = this;
        testUrl = 'http://example.com/feed.rss';

        self.emitter.on('fetch', function (db, feedId, feedUrl) {

            self.db.get('SELECT count(*) as count FROM feeds WHERE id=? AND nextFetchUtc IS NOT NULL', [feedId], function (err, row) {
                assert.strictEqual(row.count, 1);
                done();
            });
        });

        self.db.run('INSERT INTO feeds (url) VALUES (?)', [testUrl], function (err) {
            self.emitter.emit('poll', self.db);
        });
    });

    it('emits done event', function (done) {
        var self, testUrl;
        self = this;
        testUrl = 'http://example.com/feed.rss';

        self.emitter.on('poll:done', function (feedId, feedUrl) {
            assert.strictEqual(feedId, 1);
            assert.strictEqual(feedUrl, testUrl);
            done();
        });

        self.db.run('INSERT INTO feeds (url) VALUES (?)', [testUrl], function (err) {
            self.emitter.emit('poll', self.db);
        });
    });

    it('logs failure to query for feed', function (done) {
        var self = this;
        
        self.emitter.on('log:error', function () {
            done();
        });
        
        self.emitter.on('poll:done', function (feedId, feedUrl) {
            assert(!feedId);
            assert(!feedUrl);
        });
        self.db.run('DROP TABLE IF EXISTS feeds', [], function () {
            self.emitter.emit('poll', self.db);
        });
    });

    it('logs when no feeds are fetchable', function (done) {
        var self = this;
        
        self.emitter.on('log:trace', function () {
            done();
        });
        
        self.emitter.on('poll:done', function (feedId, feedUrl) {
            assert(!feedId);
            assert(!feedUrl);
        });
        
        self.emitter.emit('poll', self.db);
    });
    
});
    
