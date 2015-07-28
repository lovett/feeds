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
        this.feedId = 1;
        this.fetchId = 'fetch';
        this.mockUrlPath = '/2.2/questions?site=emacs&order=desc&sort=week&filter=!.Hq849GtQAYbstk1tqHP6_wvoz8SU';
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
        var self = this;

        this.requestMock.reply(200, {
            items: [
                {'answer_count': 3, 'score': 12, 'creation_date': 1436868796, 'link': 'the url', 'title': 'the title', 'owner': { 'display_name': 'author'}}
            ]
        });

        self.emitter.on('entry', function (args) {
            assert.strictEqual(args.feedId, self.feedId);
            assert.strictEqual(args.fetchId, self.fetchId);
            done();
        });

        self.emitter.emit('fetch:stackexchange', {
            id: this.feedId,
            fetchId: this.fetchId,
            url: this.feedUrl
        });
    });

});
