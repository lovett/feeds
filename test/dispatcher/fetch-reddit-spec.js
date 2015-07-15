var nock = require('nock');
var assert = require('assert');
var events = require('events');
var fetchReddit = require('../../dispatcher/fetch/reddit');
var needle = require('needle');

describe('reddit fetch handler', function() {
    beforeEach(function (done) {
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
        var self, feedId, subscribers;

        self = this;
        feedId = 1;
        subscribers = 'bar';

        this.requestMock.reply(200, {});

        self.emitter.on('fetch:reddit:done', function (jsonUrl, statusCode) {
            assert.strictEqual(jsonUrl, 'https://www.reddit.com/r/javascript/.json');
            assert.strictEqual(statusCode, 200);
            done();
        });
        
        self.emitter.emit('fetch:reddit', feedId, this.feedUrl, subscribers);
    });

    it('logs failure', function (done) {
        var self, feedId, subscribers;

        self = this;
        feedId = 1;
        subscribers = 'bar';

        this.requestMock.reply(400, {});

        self.emitter.on('log:warn', function (params) {
            assert.strictEqual(params.response, 400);
            done();
        });
        
        self.emitter.emit('fetch:reddit', feedId, this.feedUrl, subscribers);
    });

    it('handles absence of children in response', function (done) {
        var self, feedId, subscribers;

        self = this;
        feedId = 1;
        subscribers = 'bar';

        this.requestMock.reply(200, { data: {} });

        self.emitter.on('fetch:reddit:done', function (jsonUrl, statusCode, itemCount) {
            assert.strictEqual(itemCount, 0);
            done();
        });
        
        self.emitter.emit('fetch:reddit', feedId, this.feedUrl, subscribers);
    });

    it('triggers entry storage', function (done) {
        var self, feedId, subscribers;

        self = this;
        feedId = 1;
        subscribers = 'bar';

        this.requestMock.reply(200, {
            data: {
                children: [
                    {"data": {"num_comments": 3, "permalink": "the permalink", "created": 1436999356.0, "url": "the url", "title": "the title", "created_utc": 1436970556.0}}
                ]
            }
        });

        self.emitter.on('entry', function (entryFeedId, entryFields, entryFeedSubscribers) {
            assert.strictEqual(feedId, entryFeedId);
            assert.strictEqual(subscribers, entryFeedSubscribers);
            done();
        });
        
        self.emitter.emit('fetch:reddit', feedId, this.feedUrl, subscribers);
        
    });
    
});
