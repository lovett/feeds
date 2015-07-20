var assert = require('assert');
var events = require('events');
var fetch = require('../../dispatcher/fetch');

describe('fetch handler', function() {
    beforeEach(function (done) {
        this.emitter = new events.EventEmitter();
        this.emitter.on('fetch', fetch);
        done();
    });

    afterEach(function () {
        this.emitter.removeAllListeners();
    });

    it('delegates fetches of reddit feeds', function (done) {
        var self, feedId, feedUrl, subscribers;

        self = this;
        feedId = 1;
        feedUrl = 'http://reddit.com/feed.rss';
        subscribers = 'bar';
        
        self.emitter.on('fetch:reddit', function (feedId, feedUrl, subscribers) {
            assert.strictEqual(feedId, feedId);
            assert.strictEqual(feedUrl, feedUrl);
            assert.strictEqual(subscribers, subscribers);
            done();
        });

        self.emitter.emit('fetch', feedId, feedUrl, subscribers);
    });

    it('delegates fetches of stackexchange feeds', function (done) {
        var self, feedId, feedUrl, subscribers;

        self = this;
        feedId = 1;
        feedUrl = 'http://stackexchange.com/feed.rss';
        subscribers = 'bar';
        
        self.emitter.on('fetch:stackexchange', function (feedId, feedUrl, subscribers) {
            assert.strictEqual(feedId, feedId);
            assert.strictEqual(feedUrl, feedUrl);
            assert.strictEqual(subscribers, subscribers);
            done();
        });

        self.emitter.emit('fetch', feedId, feedUrl, subscribers);
    });

    it('delegates fetches of hacker news feeds', function (done) {
        var self, feedId, feedUrl, subscribers;

        self = this;
        feedId = 1;
        feedUrl = 'http://news.ycombinator.com/feed.rss';
        subscribers = 'bar';
        
        self.emitter.on('fetch:hn', function (feedId, feedUrl, subscribers) {
            assert.strictEqual(feedId, feedId);
            assert.strictEqual(feedUrl, feedUrl);
            assert.strictEqual(subscribers, subscribers);
            done();
        });

        self.emitter.emit('fetch', feedId, feedUrl, subscribers);
    });

    it('delegates fetching to default handler', function (done) {
        var self, feedId, feedUrl, subscribers;

        self = this;
        feedId = 1;
        feedUrl = 'http://example.com/feed.rss';
        subscribers = 'bar';
        
        self.emitter.on('fetch:default', function (feedId, feedUrl, subscribers) {
            assert.strictEqual(feedId, feedId);
            assert.strictEqual(feedUrl, feedUrl);
            assert.strictEqual(subscribers, subscribers);
            done();
        });

        self.emitter.emit('fetch', feedId, feedUrl, subscribers);
    });
    
});
