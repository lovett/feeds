var assert, events, fetchReddit, nock;

nock = require('nock');
assert = require('assert');
events = require('events');
fetchReddit = require('../../dispatcher/fetch/reddit');

describe('reddit fetch handler', function() {
    'use strict';

    beforeEach(function (done) {
        this.feedId = 1;
        this.feedUrl = 'http://reddit.com/r/javascript';
        this.requestMock = nock('https://www.reddit.com').get('/r/javascript/.json');
        this.emitter = new events.EventEmitter();
        this.emitter.on('fetch:reddit', fetchReddit);
        done();
    });

    afterEach(function () {
        this.emitter.removeAllListeners();
        this.emitter.httpClient = null;
    });

    it('normalizes the feed URL to JSON over HTTPS', function (done) {
        var self;

        self = this;

        this.requestMock.reply(200, {});

        self.emitter.on('fetch:done', function (jsonUrl, statusCode) {
            assert.strictEqual(jsonUrl, 'https://www.reddit.com/r/javascript/.json');
            assert.strictEqual(statusCode, 200);
            done();
        });

        self.emitter.emit('fetch:reddit', this.feedId, this.feedUrl);
    });

    it('logs failure', function (done) {
        var self;

        self = this;

        this.requestMock.reply(400, {});

        self.emitter.on('log:warn', function (message, fields) {
            assert.strictEqual(fields.status, 400);
            done();
        });

        self.emitter.emit('fetch:reddit', this.feedId, this.feedUrl);
    });

    it('handles absence of children in response', function (done) {
        var self;

        self = this;

        this.requestMock.reply(200, { data: {} });

        self.emitter.on('fetch:done', function (jsonUrl, statusCode, itemCount) {
            assert.strictEqual(itemCount, 0);
            done();
        });

        self.emitter.emit('fetch:reddit', this.feedId, this.feedUrl);
    });

    it('triggers entry storage', function (done) {
        var self;

        self = this;

        this.requestMock.reply(200, {
            data: {
                children: [
                    {'data': {'num_comments': 3, 'permalink': 'the permalink', 'created': 1436999356.0, 'url': 'the url', 'title': 'the title', 'created_utc': 1436970556.0}}
                ]
            }
        });

        self.emitter.on('entry', function (entryFeedId) {
            assert.strictEqual(entryFeedId, self.feedId);
            done();
        });

        self.emitter.emit('fetch:reddit', this.feedId, this.feedUrl);

    });

});
