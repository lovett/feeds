var assert, events, fetchStackExchange, nock, url;

url = require('url');
nock = require('nock');
assert = require('assert');
events = require('events');
fetchStackExchange = require('../../dispatcher/fetch/stackexchange');

describe('stackexchange fetch handler', function() {
    'use strict';

    beforeEach(function (done) {
        this.feedUrl = 'http://example.stackexchange.com/feeds';
        this.feedId = 1;
        this.fetchId = 'fetch';
        this.mockUrlPath = '/2.2/questions?site=example&order=desc&sort=week&filter=!LaSRLvLuv_4B5l2XT986IL';
        this.requestMock = nock('https://api.stackexchange.com').get(this.mockUrlPath);
        this.emitter = new events.EventEmitter();
        this.emitter.on('fetch:stackexchange', fetchStackExchange);
        done();
    });

    afterEach(function () {
        this.emitter.removeAllListeners();
        this.emitter.httpClient = null;
    });

    it('normalizes the feed URL to JSON over HTTPS', function (done) {
        var self = this;

        this.requestMock.reply(200, {'items': []});

        self.emitter.on('fetch:done', function (args) {
            var parsedApiUrl = url.parse(args.url);
            assert.strictEqual(parsedApiUrl.path, self.mockUrlPath);
            assert.strictEqual(args.fetchId, self.fetchId);
            assert.strictEqual(args.status, 200);
            done();
        });

        self.emitter.emit('fetch:stackexchange', {
            id: this.feedId,
            fetchId: this.fetchId,
            url: this.feedUrl
        });
    });

    it('logs failure', function (done) {
        var self = this;

        this.requestMock.reply(400, {});

        self.emitter.on('log:warn', function (message, params) {
            assert.strictEqual(params.response, 400);
            done();
        });

        self.emitter.emit('fetch:stackexchange', {
            id: this.feedId,
            fetchId: this.fetchId,
            url: this.feedUrl
        });
    });

    it('handles absence of children in response', function (done) {
        var self = this;

        this.requestMock.reply(200, { data: {} });

        self.emitter.on('fetch:done', function (args) {
            assert.strictEqual(args.itemCount, 0);
            done();
        });

        self.emitter.emit('fetch:stackexchange', {
            feedId: this.feedId,
            fetchId: this.fetchId,
            url: this.feedUrl
        });
    });

    it('triggers entry storage', function (done) {
        var response, self;

        self = this;

        response = {
            items: [
                {
                    'tags': [
                        'regular-expressions'
                    ],
                    'owner': {
                        'reputation': 2565,
                        'user_id': 2642,
                        'user_type': 'registered',
                        'accept_rate': 71,
                        'profile_image': 'http://example.com',
                        'display_name': 'PythonNut',
                        'link': 'http://example.net/users/123/user'
                    },
                    'view_count': 50,
                    'accepted_answer_id': 1,
                    'answer_count': 1,
                    'score': 5,
                    'creation_date': 1438389050,
                    'question_id': 1,
                    'body_markdown': 'I want to write a function',
                    'link': 'http://example.org/entry',
                    'title': 'This is the title'
                }
            ]
        };

        this.requestMock.reply(200, response);

        self.emitter.on('entry', function (args) {
            var item = response.items[0];
            assert.strictEqual(args.feedId, self.feedId);
            assert.strictEqual(args.fetchId, self.fetchId);
            assert.strictEqual(args.title, item.title);
            assert.strictEqual(args.createdUtcSeconds, item.creation_date);
            assert.strictEqual(args.url, item.link);
            assert.strictEqual(args.body, item.body_markdown);
            assert.strictEqual(args.extras.score, item.score);
            assert.strictEqual(args.extras.keywords, item.tags.join(' '));
            assert.strictEqual(args.discussion.tally, item.answer_count);
            assert.strictEqual(args.discussion.label, url.parse(self.feedUrl).host);
            assert.strictEqual(args.discussion.url, item.link);
            done();
        });

        self.emitter.emit('fetch:stackexchange', {
            id: this.feedId,
            fetchId: this.fetchId,
            url: this.feedUrl
        });
    });

});
