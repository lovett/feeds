var assert, events, fetchReddit, nock;

nock = require('nock');
assert = require('assert');
events = require('events');
fetchReddit = require('../../dispatcher/fetch/reddit');

describe('reddit fetch handler', function() {
    'use strict';

    beforeEach(function (done) {
        this.feedId = 1;
        this.fetchId = 'fetch';
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

        self.emitter.on('fetch:done', function (args) {
            assert.strictEqual(args.url, 'https://www.reddit.com/r/javascript/.json');
            assert.strictEqual(args.status, 200);
            done();
        });

        self.emitter.emit('fetch:reddit', {
            id: this.feedId,
            fetchId: this.fetchId,
            url: this.feedUrl
        });
    });

    it('logs failure', function (done) {
        var self;

        self = this;

        this.requestMock.reply(400, {});

        self.emitter.on('log:warn', function (message, fields) {
            assert.strictEqual(fields.status, 400);
            done();
        });

        self.emitter.emit('fetch:reddit', {
            id: this.feedId,
            fetchId: this.fetchId,
            url: this.feedUrl
        });
    });

    it('handles absence of children in response', function (done) {
        var self;

        self = this;

        this.requestMock.reply(200, { data: {} });

        self.emitter.on('fetch:done', function (args) {
            assert.strictEqual(args.itemCount, 0);
            done();
        });

        self.emitter.emit('fetch:reddit', {
            id: this.feedId,
            fetchId: this.fetchId,
            url: this.feedUrl
        });
    });

    it('triggers entry storage', function (done) {
        var self;

        self = this;

        this.requestMock.reply(200, {
            data: {
                children: [
                    {'data': {'num_comments': 3, 'permalink': 'the permalink', 'created': 1436999356.0, 'author': 'the author', 'url': 'the url', 'title': 'the title', 'created_utc': 1436970556.0}}
                ]
            }
        });

        self.emitter.on('entry', function (args) {
            assert.strictEqual(args.feedId, self.feedId);
            assert.strictEqual(args.fetchId, self.fetchId);
            assert.strictEqual(args.url, 'the url');
            assert.strictEqual(args.author, 'the author');
            done();
        });

        self.emitter.emit('fetch:reddit', {
            id: this.feedId,
            fetchId: this.fetchId,
            url: this.feedUrl
        });
    });

});
