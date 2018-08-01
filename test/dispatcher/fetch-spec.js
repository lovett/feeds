'use strict';

const assert = require('assert');
const events = require('events');
const fetch = require('../../dispatcher/fetch');

describe('fetch', function() {

    beforeEach(function (done) {
        this.feedId = 1;
        this.emitter = new events.EventEmitter();
        this.emitter.on('fetch', fetch);
        done();
    });

    afterEach(function () {
        this.emitter.removeAllListeners();
    });

    it('delegates fetches of reddit feeds', function (done) {
        const self = this;
        const url = 'http://reddit.com/feed.rss';

        self.emitter.on('fetch:reddit', function (feedId, feedUrl, callback) {
            callback();
            assert.strictEqual(feedId, self.feedId);
            assert.strictEqual(feedUrl, url);
            done();
        });

        self.emitter.emit('fetch', self.feedId, url);
    });

    it('delegates fetches of Hacker News feeds', function (done) {
        const self = this;
        const url = 'http://news.ycombinator.com/feed.rss';

        self.emitter.on('fetch-hackernews', function (feedId, feedUrl, callback) {
            callback();
            assert.strictEqual(feedId, self.feedId);
            assert.strictEqual(feedUrl, url);
            done();
        });

        self.emitter.emit('fetch', self.feedId, url);
    });

    it('delegates fetching to default handler', function (done) {
        const self = this;
        const url = 'http://example.com/feed.rss';

        self.emitter.on('fetch-default', function (feedId, feedUrl, callback) {
            callback();
            assert.strictEqual(feedId, self.feedId);
            assert.strictEqual(feedUrl, url);
            done();
        });

        self.emitter.emit('fetch', self.feedId, url);
    });

    it('receives errors via callback', function (done) {
        const self = this;
        const url = 'http://example.org/feed.rss';

        self.emitter.on('fetch-default', function (feedId, feedUrl, callback) {
            callback(new Error());
        });

        self.emitter.emit('fetch', self.feedId, url, (err) => {
            assert(err instanceof Error);
            done();
        });
    });
});
