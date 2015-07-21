var assert, events, fetchDefault, moment, nock;

nock = require('nock');
assert = require('assert');
events = require('events');
fetchDefault = require('../../dispatcher/fetch/default');
moment = require('moment');

describe('default fetch handler', function() {
    'use strict';

    beforeEach(function (done) {
        this.feedUrl = 'http://example.com/feed';
        this.feedId = 1;
        this.subscribers = 'bar';
        this.requestMock = nock('http://example.com').get('/feed');
        this.emitter = new events.EventEmitter();
        this.emitter.on('fetch:default', fetchDefault);
        done();
    });

    afterEach(function () {
        this.emitter.removeAllListeners();
    });

    it('logs failure', function (done) {
        var self = this;

        this.requestMock.reply(400, {});

        self.emitter.on('log:warn', function (message, params) {
            assert.strictEqual(params.response, 400);
            done();
        });

        self.emitter.emit('fetch:default', this.feedId, this.feedUrl, this.subscribers);
    });

    it('handles absence of children in response', function (done) {
        var self = this;

        this.requestMock.reply(200, { data: {} });

        self.emitter.on('fetch:default:done', function (fetchUrl, statusCode, itemCount) {
            assert.strictEqual(itemCount, 0);
            done();
        });

        self.emitter.emit('fetch:default', this.feedId, self.feedUrl, this.subscribers);
    });

    it('identifies the entry container for atom feeds', function (done) {
        var self = this;

        this.requestMock.reply(200, { feed: {
            entry: [1, 2, 3, 4, 5]
        } });

        self.emitter.on('fetch:default:done', function (fetchUrl, statusCode, itemCount) {
            assert.strictEqual(itemCount, 5);
            done();
        });

        self.emitter.emit('fetch:default', this.feedId, self.feedUrl, this.subscribers);
    });

    it('identifies the entry container for rss feeds', function (done) {
        var self = this;

        this.requestMock.reply(200, {
            rss: {
                channel: {
                    item: [1, 2, 3, 4, 5]
                }
            }
        });

        self.emitter.on('fetch:default:done', function (fetchUrl, statusCode, itemCount) {
            assert.strictEqual(itemCount, 5);
            done();
        });

        self.emitter.emit('fetch:default', this.feedId, self.feedUrl, this.subscribers);
    });

    it('identifies the entry container for rdf feeds', function (done) {
        var self = this;

        this.requestMock.reply(200, {
            item: [1, 2, 3, 4, 5]
        });

        self.emitter.on('fetch:default:done', function (fetchUrl, statusCode, itemCount) {
            assert.strictEqual(itemCount, 5);
            done();
        });

        self.emitter.emit('fetch:default', this.feedId, self.feedUrl, this.subscribers);
    });

    it('logs failure to identify item container', function (done) {
        var self = this;

        this.requestMock.reply(200, {
            rss: {
                foo: {
                    bar: [1, 2, 3, 4, 5]
                }
            }
        });

        self.emitter.on('log:warn', function (message, fields) {
            assert.strictEqual(fields.url, self.feedUrl);
            done();
        });

        self.emitter.emit('fetch:default', this.feedId, self.feedUrl, this.subscribers);
    });

    it('triggers entry storage for atom feeds', function (done) {
        var reply, self;
        self = this;

        reply = {
            feed: {
                entry: [{
                    title: { _: 'the title', '$': {type: 'text'} },
                    published: new Date(),
                    link: [
                        { '$':
                          { rel: 'replies',
                            type: 'application/atom+xml',
                            href: 'http://example.com/replies',
                            title: 'Post Comments' }
                        },
                        { '$':
                          { rel: 'whatever',
                            type: 'text/html',
                            href: 'http://example.com/whatever'
                          }
                        },
                        { '$':
                          { rel: 'alternate',
                            type: 'text/html',
                            href: 'http://example.com/entry',
                            title: 'link title'
                          }
                        }
                    ]
                }]
            }
        };

        this.requestMock.reply(200, reply);

        self.emitter.on('entry', function (feedId, fields, subscribers) {
            assert.strictEqual(feedId, self.feedId);
            assert.strictEqual(subscribers, self.subscribers);
            assert.strictEqual(fields.title, reply.feed.entry[0].title._);
            assert.strictEqual(fields.url, 'http://example.com/entry');
            assert.strictEqual(fields.createdUtc, moment(reply.feed.entry[0].published).format('X') * 1000);
            done();
        });

        self.emitter.emit('fetch:default', this.feedId, self.feedUrl, this.subscribers);

    });

    it('picks up original link from feedburner feeds', function (done) {
        var reply, self;
        self = this;

        reply = {
            feed: {
                entry: [{
                    'feedburner:origLink': 'http://example.com/entry'
                }]
            }
        };

        this.requestMock.reply(200, reply);

        self.emitter.on('entry', function (feedId, fields, subscribers) {
            assert.strictEqual(feedId, self.feedId);
            assert.strictEqual(subscribers, self.subscribers);
            assert.strictEqual(fields.url, reply.feed.entry[0]['feedburner:origLink']);
            done();
        });

        self.emitter.emit('fetch:default', this.feedId, self.feedUrl, this.subscribers);

    });

    it('triggers entry storage for rss feeds', function (done) {
        var reply, self;
        self = this;

        reply = {
            rss: {
                channel: {
                    item: [
                        {
                            title: 'the title',
                            pubDate: new Date(),
                            link: 'http://example.com/entry',
                            comments: 'http://example.com/comments'
                        }
                    ]
                }
            }
        };

        this.requestMock.reply(200, reply);

        self.emitter.on('entry', function (feedId, fields, subscribers) {
            var replyItem = reply.rss.channel.item[0];
            assert.strictEqual(feedId, self.feedId);
            assert.strictEqual(subscribers, self.subscribers);
            assert.strictEqual(fields.title, replyItem.title);
            assert.strictEqual(fields.url, replyItem.link);
            assert.strictEqual(fields.createdUtc, moment(replyItem.pubDate).format('X') * 1000);
            assert.strictEqual(fields.discussion.url, replyItem.comments);
            assert.strictEqual(fields.discussion.label, 'example.com');
            done();
        });

        self.emitter.emit('fetch:default', this.feedId, self.feedUrl, this.subscribers);

    });

    it('triggers entry storage for rdf feeds', function (done) {
        var reply, self;
        self = this;

        reply = {
            item: [
                {
                    title: 'the title',
                    pubDate: new Date(),
                    link: 'http://example.com/entry'
                }
            ]
        };

        this.requestMock.reply(200, reply);

        self.emitter.on('entry', function (feedId, fields, subscribers) {
            assert.strictEqual(feedId, self.feedId);
            assert.strictEqual(subscribers, self.subscribers);
            assert.strictEqual(fields.title, reply.item[0].title);
            assert.strictEqual(fields.url, reply.item[0].link);
            assert.strictEqual(fields.createdUtc, moment(reply.item[0].pubDate).format('X') * 1000);
            done();
        });

        self.emitter.emit('fetch:default', this.feedId, self.feedUrl, this.subscribers);

    });
});
