var assert, events, fetchDefault, nock;

nock = require('nock');
assert = require('assert');
events = require('events');
fetchDefault = require('../../dispatcher/fetch/default');

describe('default fetch handler', function() {
    'use strict';

    beforeEach(function (done) {
        this.feedUrl = 'http://example.com/feed';
        this.feedId = 1;
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

        self.emitter.emit('fetch:default', this.feedId, this.feedUrl);
    });

    it('handles absence of children in response', function (done) {
        var self = this;

        this.requestMock.reply(200, { data: {} });

        self.emitter.on('fetch:default:done', function (fetchUrl, statusCode, itemCount) {
            assert.strictEqual(itemCount, 0);
            done();
        });

        self.emitter.emit('fetch:default', this.feedId, self.feedUrl);
    });

    it('identifies the entry container for atom feeds', function (done) {
        var self = this;

        this.requestMock.reply(200, { feed: {
            entry: []
        } });

        self.emitter.on('fetch:default:done', function (fetchUrl, statusCode, itemCount) {
            assert.strictEqual(itemCount, 0);
            done();
        });

        self.emitter.emit('fetch:default', this.feedId, self.feedUrl);
    });

    it('identifies the entry container for rss feeds', function (done) {
        var self = this;

        this.requestMock.reply(200, {
            rss: {
                channel: {
                    item: []
                }
            }
        });

        self.emitter.on('fetch:default:done', function (fetchUrl, statusCode, itemCount) {
            assert.strictEqual(itemCount, 0);
            done();
        });

        self.emitter.emit('fetch:default', this.feedId, self.feedUrl);
    });

    it('identifies the entry container for rdf feeds', function (done) {
        var self = this;

        this.requestMock.reply(200, {
            'rdf:RDF': {
                item: []
            }
        });

        self.emitter.on('fetch:default:done', function (fetchUrl, statusCode, itemCount) {
            assert.strictEqual(itemCount, 0);
            done();
        });

        self.emitter.emit('fetch:default', this.feedId, self.feedUrl);
    });

    it('logs failure to identify item container', function (done) {
        var self = this;

        this.requestMock.reply(200, {
            rss: {
                foo: {
                    bar: []
                }
            }
        });

        self.emitter.on('log:warn', function (message, fields) {
            assert.strictEqual(fields.url, self.feedUrl);
            done();
        });

        self.emitter.emit('fetch:default', this.feedId, self.feedUrl);
    });

    it('triggers entry storage for atom feeds', function (done) {
        var reply, self;
        self = this;

        reply = {
            feed: {
                entry: [{
                    title: { _: 'the title', '$': {type: 'text'} },
                    published: new Date().toString(),
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

        self.emitter.on('entry', function (feedId, fields) {
            assert.strictEqual(feedId, self.feedId);
            assert.strictEqual(fields.title, reply.feed.entry[0].title._);
            assert.strictEqual(fields.url, 'http://example.com/entry');
            assert.strictEqual(fields.created, reply.feed.entry[0].published);
            done();
        });

        self.emitter.emit('fetch:default', this.feedId, self.feedUrl);

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

        self.emitter.on('entry', function (feedId, fields) {
            assert.strictEqual(feedId, self.feedId);
            assert.strictEqual(fields.url, reply.feed.entry[0]['feedburner:origLink']);
            done();
        });

        self.emitter.emit('fetch:default', this.feedId, self.feedUrl);

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
                            pubDate: new Date().toString(),
                            link: 'http://example.com/entry',
                            comments: 'http://example.com/comments'
                        }
                    ]
                }
            }
        };

        this.requestMock.reply(200, reply);

        self.emitter.on('entry', function (feedId, fields) {
            var replyItem = reply.rss.channel.item[0];
            assert.strictEqual(feedId, self.feedId);
            assert.strictEqual(fields.title, replyItem.title);
            assert.strictEqual(fields.url, replyItem.link);
            assert.strictEqual(fields.created, replyItem.pubDate);
            assert.strictEqual(fields.discussion.url, replyItem.comments);
            assert.strictEqual(fields.discussion.label, 'example.com');
            done();
        });

        self.emitter.emit('fetch:default', this.feedId, self.feedUrl);

    });

    it('triggers entry storage for rdf feeds', function (done) {
        var reply, self;
        self = this;

        reply = {
            'rdf:RDF': {
                item: [
                    {
                        title: 'the title',
                        pubDate: new Date().toString(),
                        link: 'http://example.com/entry'
                    }
                ]
            }
        };

        this.requestMock.reply(200, reply);

        self.emitter.on('entry', function (feedId, fields) {
            var firstItem = reply['rdf:RDF'].item[0];
            assert.strictEqual(feedId, self.feedId);
            assert.strictEqual(fields.title, firstItem.title);
            assert.strictEqual(fields.url, firstItem.link);
            assert.strictEqual(fields.created, firstItem.pubDate);
            done();
        });

        self.emitter.emit('fetch:default', this.feedId, self.feedUrl);

    });

    it('ignores duplicate normalized urls', function (done) {
        var reply, self;

        self = this;

        reply = {
            rss: {
                channel: {
                    item: [
                        {title: 'the title', link: 'http://example.com/entry#hash1'},
                        {title: 'the title', link: 'http://example.com/entry#hash2'},
                        {title: 'the title', link: 'http://example.com/entry#hash3'}
                    ]
                }
            }
        };

        this.requestMock.reply(200, reply);

        self.emitter.on('fetch:default:done', function (feedUrl, statusCode, itemCount) {
            assert.strictEqual(feedUrl, self.feedUrl);
            assert.strictEqual(statusCode, 200);
            assert.strictEqual(itemCount, 1);
            done();
        });

        self.emitter.emit('fetch:default', this.feedId, self.feedUrl);

    });

});
