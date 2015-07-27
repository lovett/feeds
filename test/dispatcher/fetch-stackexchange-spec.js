var assert, events, fetchStackExchange, nock, url;

url = require('url');
nock = require('nock');
assert = require('assert');
events = require('events');
fetchStackExchange = require('../../dispatcher/fetch/stackexchange');

describe('stackexchange fetch handler', function() {
    'use strict';

    beforeEach(function (done) {
        this.feedUrl = 'http://emacs.stackexchange.com/feeds';
        this.fetchId = 'fetch';
        this.mockUrlPath = '/2.2/questions?site=emacs&order=desc&sort=week&filter=!)R7_Ydm)7LrqRF9BkudkXj*v';
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
        var feedId, self;

        self = this;
        feedId = 1;

        this.requestMock.reply(200, {'items': []});

        self.emitter.on('fetch:done', function (fetchedFeedId, fetchId, apiUrl, statusCode) {
            var parsedApiUrl = url.parse(apiUrl);
            assert.strictEqual(parsedApiUrl.path, self.mockUrlPath);
            assert.strictEqual(fetchId, self.fetchId);
            assert.strictEqual(statusCode, 200);
            done();
        });

        self.emitter.emit('fetch:stackexchange', feedId, this.fetchId, this.feedUrl);
    });

    it('logs failure', function (done) {
        var feedId, self;

        self = this;
        feedId = 1;

        this.requestMock.reply(400, {});

        self.emitter.on('log:warn', function (message, params) {
            assert.strictEqual(params.response, 400);
            done();
        });

        self.emitter.emit('fetch:stackexchange', feedId, this.fetchId, this.feedUrl);
    });

    it('handles absence of children in response', function (done) {
        var feedId, self;

        self = this;
        feedId = 1;

        this.requestMock.reply(200, { data: {} });

        self.emitter.on('fetch:done', function (fetchedFeedId, fetchId, apiUrl, statusCode, itemCount) {
            assert.strictEqual(itemCount, 0);
            done();
        });

        self.emitter.emit('fetch:stackexchange', feedId, self.fetchId, self.feedUrl);
    });

    it('triggers entry storage', function (done) {
        var feedId, self;

        self = this;
        feedId = 1;

        this.requestMock.reply(200, {
            items: [
                {'answer_count': 3, 'score': 12, 'creation_date': 1436868796, 'link': 'the url', 'title': 'the title'}
            ]
        });

        self.emitter.on('entry', function (entryFeedId, entryFetchId) {
            assert.strictEqual(feedId, entryFeedId);
            assert.strictEqual(entryFetchId, self.fetchId);
            done();
        });

        self.emitter.emit('fetch:stackexchange', feedId, self.fetchId, self.feedUrl);

    });

});
