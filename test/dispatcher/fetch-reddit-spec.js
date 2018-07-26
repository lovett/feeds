'use strict';

const nock = require('nock');
const assert = require('assert');
const events = require('events');
const fetchReddit = require('../../dispatcher/fetch/reddit');

describe('fetch:reddit', function() {
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

    it('normalizes the feed URL to RSS over HTTPS', function (done) {
        const self = this;

        self.requestMock.reply(200, {
            data: {
                children: [
                    {
                        data: {
                            title: 'test',
                            subreddit_name_prefixed: 'r/javascript'
                        }
                    }
                ]
            }
        });

        self.emitter.on('feed:update', (feedId, meta) => {
            assert.strictEqual(meta.url, 'https://www.reddit.com/r/javascript/.rss');
            done();
        });

        self.emitter.emit('fetch:reddit', self.feedId, self.feedUrl);
    });

    it('handles error response', function (done) {
        const self = this;

        self.requestMock.reply(400, {});

        self.emitter.on('stats:fetch', (feedId, fetchId, statusCode, itemCount) => {
            assert.strictEqual(itemCount, 0);
            done();
        });

        self.emitter.emit('fetch:reddit', self.feedId, self.feedUrl);
    });

    it('handles malformed  response', function (done) {
        const self = this;

        self.emitter.on('stats:fetch', (feedId, fetchId, statusCode, itemCount) => {
            assert.strictEqual(itemCount, 0);
            done();
        });

        self.emitter.emit('fetch:reddit', self.feedId, 'invalid-url');
    });

    it('handles absence of children in response', function (done) {
        const self = this;

        self.requestMock.reply(200, {
            data: {}
        });

        self.emitter.on('stats:fetch', function (feedId, fetchId, statusCode, itemCount) {
            assert.strictEqual(itemCount, 0);
            done();
        });

        self.emitter.emit('fetch:reddit', self.feedId, self.feedUrl);
    });

    it('triggers entry storage', function (done) {
        const self = this;

        this.requestMock.reply(200, {
            data: {
                'children': [{
                    'data': {
                        'num_comments': 3,
                        'permalink': 'the permalink',
                        'author': 'the author',
                        'url': 'the url',
                        'title': 'the title',
                        'created_utc': 1,
                        'selftext': 'the body',
                        'score': 1234,
                        'link_flair_text': 'keyword1 keyword2'
                    },
                    'data': {
                        'num_comments': 4,
                        'permalink': 'the second permalink',
                        'author': 'the second author',
                        'url': 'the second url',
                        'title': 'the second title',
                        'created_utc': 2,
                        'selftext': 'the second body',
                        'score': 1234,
                        'link_flair_text': 'keyword3 keyword4'
                    }

                }]
            }
        });

        self.emitter.on('entry:store', function (entry) {
            assert.strictEqual(entry.feedId, self.feedId);
            assert(entry.fetchId);
            assert.strictEqual(entry.url, 'the second url');
            assert.strictEqual(entry.author, 'the second author');
            assert.strictEqual(entry.body, 'the second body');
            assert.strictEqual(entry.extras.score, 1234);
            assert.strictEqual(entry.extras.keywords, 'keyword3 keyword4');
            assert.strictEqual(entry.discussion.commentCount, 4);
            done();
        });

        self.emitter.emit('fetch:reddit', self.feedId, self.feedUrl);
    });

    it('skips automoderator entries', function (done) {
        const self = this;

        this.requestMock.reply(200, {
            data: {
                'children': [{
                    'data': {
                        'author': 'automoderator',
                    }
                }]
            }
        });

        self.emitter.on('entry:store', () => {
            throw new Error('entry:store should not have been called');
        });

        self.emitter.emit('fetch:reddit', self.feedId, self.feedUrl, () => {
            done();
        });
    });

    it('skips stickied entries', function (done) {
        const self = this;

        this.requestMock.reply(200, {
            'data': {
                'children': [{
                    'data': {
                        'stickied': true
                    }
                }]
            }
        });

        self.emitter.on('entry:store', () => {
            throw new Error('entry:store should not have been called');
        });

        self.emitter.emit('fetch:reddit', self.feedId, self.feedUrl, () => {
            done();
        });
    });

});
