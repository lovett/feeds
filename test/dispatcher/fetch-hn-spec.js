'use strict';

const nock = require('nock');
const assert = require('assert');
const events = require('events');
const fetchHackernews = require('../../dispatcher/fetch/hackernews');

describe('fetch:hackernews', function() {
    beforeEach(function (done) {
        const baseUrl = 'https://hacker-news.firebaseio.com';
        this.feedUrl = 'http://example.com/feed';
        this.collectionMock = nock(baseUrl).get('/v0/topstories.json').query(true);
        this.itemMock = nock(baseUrl).get(/\/v0\/item\/\d.json/).query(true);
        this.secondItemMock = nock(baseUrl).get('/v0/item/2.json').query(true);
        this.feedId = 1;
        this.emitter = new events.EventEmitter();
        this.emitter.on('fetch:hackernews', fetchHackernews);
        done();
    });

    afterEach(function () {
        this.emitter.removeAllListeners();
    });

    it('triggers stat fetch on error', function (done) {
        this.emitter.on('stats:fetch', (feedId, fetchId, statusCode) => {
            assert.strictEqual(feedId, this.feedId);
            assert.strictEqual(statusCode, 0);
            done();
        });

        this.collectionMock.replyWithError('fake error for testing');

        this.emitter.emit('fetch:hackernews', this.feedId, this.feedUrl);
    });

    it('triggers stat fetch on non-200 response', function (done) {
        const status = 999;

        this.emitter.on('stats:fetch', (feedId, fetchId, statusCode) => {
            assert.strictEqual(feedId, this.feedId);
            assert.strictEqual(statusCode, status);
            done();
        });

        this.collectionMock.reply(status, {});

        this.emitter.emit('fetch:hackernews', this.feedId, this.feedUrl);
    });

    it('triggers feed update on successful response', function (done) {
        this.emitter.on('feed:update', (feedId, result) => {
            assert(result.updated);
            done();
        });

        this.collectionMock.reply(200, []);

        this.emitter.emit('fetch:hackernews', this.feedId, this.feedUrl);
    });

    it('abandons story retrieval on error', function (done) {
        const self = this;

        self.collectionMock.reply(200, [1]);
        self.itemMock.replyWithError('fake error for item test');

        self.emitter.emit('fetch:hackernews', this.feedId, this.feedUrl, (err) => {
            assert(err);
            done();
        });
    });

    it('abandons story retrieval on non-200 response', function (done) {
        const self = this;

        self.collectionMock.reply(200, [1]);
        self.itemMock.reply(404, {});

        self.emitter.emit('fetch:hackernews', this.feedId, this.feedUrl, (err) => {
            assert(err);
            done();
        });
    });


    it('triggers entry storage on successful request', function (done) {
        const self = this;
        let entryStoreCount = 0;

        self.collectionMock.reply(200, [5, 6]);

        self.itemMock.twice().reply(200, {
            by: 'test author',
            title: 'test title',
            time: (new Date()).getTime(),
            url: 'http://example.com',
            dead: false,
            score: 1,
            type: 'story',
            id: 1,
            descendants: 12345
        });

        self.emitter.on('entry:store', (entry) => {
            entryStoreCount++;
            assert.strictEqual(entry.feedUrl, self.feedUrl);
            assert.strictEqual(entry.feedId, self.feedId);
            assert(entry.fetchId);
            assert.strictEqual(entry.author, 'test author');
            assert.strictEqual(entry.title, 'test title');
            assert(entry.created);
            assert.strictEqual(entry.url, 'http://example.com');
            assert.strictEqual(entry.extras.dead, false);
            assert.strictEqual(entry.extras.score, 1);
            assert.strictEqual(entry.extras.keywords, 'story');
            assert.strictEqual(entry.discussion.url, 'https://news.ycombinator.com/item?id=1');
            assert.strictEqual(entry.discussion.label, 'news.ycombinator.com');
            assert.strictEqual(entry.discussion.commentCount, 12345);
        });

        self.emitter.emit('fetch:hackernews', this.feedId, this.feedUrl, (err) => {
            assert.ifError(err);
            assert.strictEqual(entryStoreCount, 2);
            done();
        });
    });

    it('handles empty collection', function (done) {
        const self = this;

        self.collectionMock.reply(200, []);

        self.emitter.emit('fetch:hackernews', this.feedId, this.feedUrl, (err) => {
            assert.ifError(err);
            done();
        });
    });

});
