var assert, events, fetch;

assert = require('assert');
events = require('events');
fetch = require('../../dispatcher/fetch');

describe('fetch handler', function() {
    'use strict';

    beforeEach(function (done) {
        this.feedId = 1;
        this.subscribers = 'bar';
        this.emitter = new events.EventEmitter();
        this.emitter.on('fetch', fetch);
        done();
    });

    afterEach(function () {
        this.emitter.removeAllListeners();
    });

    it('delegates fetches of reddit feeds', function (done) {
        var self, url;

        self = this;
        url = 'http://reddit.com/feed.rss';

        self.emitter.on('fetch:reddit', function (feedId, feedUrl, subscribers) {
            assert.strictEqual(feedId, self.feedId);
            assert.strictEqual(feedUrl, feedUrl);
            assert.strictEqual(subscribers, self.subscribers);
            done();
        });

        self.emitter.emit('fetch', self.feedId, url, self.subscribers);
    });

    it('delegates fetches of stackexchange feeds', function (done) {
        var self, url;

        self = this;
        url = 'http://stackexchange.com/feed.rss';

        self.emitter.on('fetch:stackexchange', function (feedId, feedUrl, subscribers) {
            assert.strictEqual(feedId, self.feedId);
            assert.strictEqual(feedUrl, url);
            assert.strictEqual(subscribers, self.subscribers);
            done();
        });

        self.emitter.emit('fetch', self.feedId, url, self.subscribers);
    });

    it('delegates fetches of hacker news feeds', function (done) {
        var self, url;

        self = this;
        url = 'http://news.ycombinator.com/feed.rss';

        self.emitter.on('fetch:hn', function (feedId, feedUrl, subscribers) {
            assert.strictEqual(feedId, self.feedId);
            assert.strictEqual(feedUrl, url);
            assert.strictEqual(subscribers, self.subscribers);
            done();
        });

        self.emitter.emit('fetch', self.feedId, url, self.subscribers);
    });

    it('delegates fetching to default handler', function (done) {
        var self, url;

        self = this;
        url = 'http://example.com/feed.rss';

        self.emitter.on('fetch:default', function (feedId, feedUrl, subscribers) {
            assert.strictEqual(feedId, self.feedId);
            assert.strictEqual(feedUrl, url);
            assert.strictEqual(subscribers, self.subscribers);
            done();
        });

        self.emitter.emit('fetch', self.feedId, url, self.subscribers);
    });

});
