var assert, events, fetchDefault, nock;

nock = require('nock');
assert = require('assert');
events = require('events');
fetchDefault = require('../../dispatcher/fetch/default');

describe('fetch:default', function() {
    'use strict';

    beforeEach(function (done) {
        this.feedUrl = 'http://example.com/feed';
        this.feedId = 1;
        this.fetchId = 'fetch';
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

        self.emitter.emit('fetch:default', {
            feedId: this.feedId,
            fetchId: this.fetchId,
            url: this.feedUrl
        });
    });

    it('handles absence of children in response', function (done) {
        var self = this;

        this.requestMock.reply(200, { data: {} });

        self.emitter.on('fetch:done', function (args) {
            assert(args.fetchId);
            assert.strictEqual(args.itemCount, 0);
            done();
        });

        self.emitter.emit('fetch:default', {
            feedId: this.feedId,
            fetchId: this.fetchId,
            url: self.feedUrl
        });
    });

    it('identifies the entry container for atom feeds', function (done) {
        var self = this;

        this.requestMock.reply(200, { feed: {
            entry: []
        } });

        self.emitter.on('fetch:done', function (args) {
            assert.strictEqual(args.itemCount, 0);
            done();
        });

        self.emitter.emit('fetch:default', {
            feedId: this.feedId,
            fetchId: this.fetchId,
            url: self.feedUrl
        });
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

        self.emitter.on('fetch:done', function (args) {
            assert.strictEqual(args.itemCount, 0);
            done();
        });

        self.emitter.emit('fetch:default', {
            feedId: this.feedId,
            fetchId: this.fetchId,
            url: self.feedUrl
        });
    });

    it('identifies the entry container for rdf feeds', function (done) {
        var self = this;

        this.requestMock.reply(200, {
            'rdf:RDF': {
                item: []
            }
        });

        self.emitter.on('fetch:done', function (args) {
            assert.strictEqual(args.itemCount, 0);
            done();
        });

        self.emitter.emit('fetch:default', {
            feedId: this.feedId,
            fetchId: this.fetchId,
            url: self.feedUrl
        });
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

        self.emitter.emit('fetch:default', {
            feedId: this.feedId,
            fetchId: this.fetchId,
            url: self.feedUrl
        });

    });

    it('triggers entry storage for atom feeds', function (done) {
        var reply, self;
        self = this;

        reply = {
            feed: {
                entry: [{
                    title: { _: 'the title', '$': {type: 'text'} },
                    published: new Date().toString(),
                    author: {
                        name: 'the author'
                    },
                    category: [
                        { '$':
                          { scheme: 'http://www.blogger.com/atom/ns#', term: 'accessibility' }
                        },
                        { '$':
                          { scheme: 'http://www.blogger.com/atom/ns#', term: 'apps' }
                        }
                    ],
                    link: [
                        { '$':
                          { rel: 'replies',
                            type: 'application/atom+xml',
                            href: 'http://example.com/replies',
                            title: 'Post Comments'
                          }
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

        self.emitter.on('entry', function (args) {
            assert.strictEqual(args.feedId, self.feedId);
            assert.strictEqual(args.fetchId, self.fetchId);
            assert.strictEqual(args.title, reply.feed.entry[0].title._);
            assert.strictEqual(args.author, reply.feed.entry[0].author.name);
            assert.strictEqual(args.url, 'http://example.com/entry');
            assert.strictEqual(args.created, reply.feed.entry[0].published);
            assert.strictEqual(args.extras.keywords, 'accessibility apps');
            done();
        });

        self.emitter.emit('fetch:default', {
            id: this.feedId,
            fetchId: this.fetchId,
            url: self.feedUrl
        });

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

        self.emitter.on('entry', function (args) {
            assert.strictEqual(args.feedId, self.feedId);
            assert.strictEqual(args.url, reply.feed.entry[0]['feedburner:origLink']);
            done();
        });

        self.emitter.emit('fetch:default', {
            id: this.feedId,
            fetchId: this.fetchId,
            url: self.feedUrl
        });

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
                            comments: 'http://example.com/comments',
                            author: 'the author',
                            category: 'test category'
                        }
                    ]
                }
            }
        };

        this.requestMock.reply(200, reply);

        self.emitter.on('entry', function (args) {
            var replyItem = reply.rss.channel.item[0];
            assert.strictEqual(args.feedId, self.feedId);
            assert.strictEqual(args.fetchId, self.fetchId);
            assert.strictEqual(args.title, replyItem.title);
            assert.strictEqual(args.author, replyItem.author);
            assert.strictEqual(args.url, replyItem.link);
            assert.strictEqual(args.created, replyItem.pubDate);
            assert.strictEqual(args.discussion.url, replyItem.comments);
            assert.strictEqual(args.discussion.label, 'example.com');
            assert.strictEqual(args.extras.keywords, 'test category');
            done();
        });

        self.emitter.emit('fetch:default', {
            id: this.feedId,
            fetchId: this.fetchId,
            url: self.feedUrl
        });
    });

    it('handles items with no url', function (done) {
        var self = this;

        this.requestMock.reply(200, {
            rss: {
                channel: {
                    item: [
                        {title: 'the title'}
                    ]
                }
            }
        });

        self.emitter.on('entry', function (entry) {
            assert.strictEqual(entry.url, undefined);
            done();
        });

        self.emitter.emit('fetch:default', {
            feedId: this.feedId,
            fetchId: this.fetchId,
            url: self.feedUrl
        });
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
                        link: 'http://example.com/entry/',
                        'dc:creator': 'the author',
                        'slash:comments': '3',
                        'dc:subject': 'test',
                        'slash:section': 'section'

                    }
                ]
            }
        };

        this.requestMock.reply(200, reply);

        self.emitter.on('entry', function (args) {
            var firstItem = reply['rdf:RDF'].item[0];
            assert.strictEqual(args.feedId, self.feedId);
            assert.strictEqual(args.fetchId, self.fetchId);
            assert.strictEqual(args.title, firstItem.title);
            assert.strictEqual(args.url, firstItem.link);
            assert.strictEqual(args.author, firstItem['dc:creator']);
            assert.strictEqual(args.created, firstItem.pubDate);
            assert.strictEqual(args.discussion.tally, parseInt(firstItem['slash:comments'], 10));
            assert.strictEqual(args.discussion.url, args.url);
            assert.strictEqual(args.extras.keywords, 'test section');
            done();
        });

        self.emitter.emit('fetch:default', {
            id: this.feedId,
            fetchId: this.fetchId,
            url: self.feedUrl
        });
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

        self.emitter.on('fetch:done', function (args) {
            assert.strictEqual(args.fetchId, self.fetchId);
            assert.strictEqual(args.feedUrl, self.feedUrl);
            assert.strictEqual(args.status, 200);
            assert.strictEqual(args.itemCount, 1);
            done();
        });

        self.emitter.emit('fetch:default', {
            id: this.feedId,
            fetchId: this.fetchId,
            url: self.feedUrl
        });
    });

});
