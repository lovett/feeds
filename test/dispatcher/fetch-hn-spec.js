var MockFirebase, assert, events, fetchHn;

MockFirebase = require('mockfirebase').MockFirebase;
assert = require('assert');
events = require('events');
fetchHn = require('../../dispatcher/fetch/hn');

// Temporarily inactive pending refactoring.
xdescribe('fetch:hn', function() {
    'use strict';

    beforeEach(function (done) {
        this.feedUrl = 'http://example.com/feed';
        this.feedId = 1;
        this.fetchId = 'fetch';
        this.hnFirebase = new MockFirebase('https://hacker-news.firebaseio.com/v0/');
        this.hnTopStories = this.hnFirebase.child('/topstories');
        this.hnTopStories.limitToFirst = function () {
            return this;
        };
        this.hnItem = this.hnFirebase.child('/item');
        this.emitter = new events.EventEmitter();
        this.emitter.on('fetch:hn', fetchHn);
        done();
    });

    afterEach(function () {
        this.emitter.removeAllListeners();
    });

    it('triggers entry storage', function (done) {
        var self, story;

        self = this;

        story = {
            id: 1,
            kids: { 0: 1, 1: 2, 2: 3},
            title: 'test',
            by: 'author',
            time: new Date().getTime(),
            url: 'http://example.com',
            type: 'story',
            dead: false,
            score: 1,
            text: 'the text'
        };

        self.hnTopStories.set([1]);
        self.hnFirebase.child('/item/1').set(story);

        self.emitter.once('entry', function (args) {
            assert.strictEqual(args.feedId, self.feedId);
            assert.strictEqual(args.fetchId, self.fetchId);
            assert.strictEqual(args.title, story.title);
            assert.strictEqual(args.createdUtcSeconds, story.time);
            assert.strictEqual(args.url, story.url);
            assert.strictEqual(args.author, story.by);
            assert.strictEqual(args.discussion.tally, story.kids.length);
            assert.strictEqual(args.discussion.url, 'https://news.ycombinator.com/item?id=1');
            assert.strictEqual(args.discussion.label, 'Hacker News');
            assert.strictEqual(args.body, story.text);
            assert.strictEqual(args.extras.score, story.score);
            assert.strictEqual(args.extras.dead, story.dead);
            done();
        });


        self.emitter.emit('fetch:hn', self.hnFirebase, {
            id: self.feedId,
            fetchId: self.fetchId,
            url: self.feedUrl
        });

        self.hnFirebase.flush();
    });

    it('handles empty snapshot for item', function (done) {
        var self = this;

        self.hnTopStories.set([1]);

        self.hnFirebase.child('/item/1').set(null);

        self.emitter.once('log:trace', function (message) {
            assert(message);
            done();
        });

        self.emitter.emit('fetch:hn', self.hnFirebase, {
            feedId: self.feedId,
            fetchId: self.fetchId,
            url: self.feedUrl
        });

        self.hnFirebase.flush();
    });

    it('handles stories without comments', function (done) {
        var self = this;

        self.hnTopStories.set([1]);

        self.hnFirebase.child('/item/1').set({
            title: 'test'
        });

        self.emitter.once('entry', function (args) {
            assert.strictEqual(args.discussion.tally, 0);
            done();
        });

        self.emitter.emit('fetch:hn', self.hnFirebase, {
            feedId: self.feedId,
            fetchId: self.fetchId,
            url: self.feedUrl
        });

        self.hnFirebase.flush();
    });

});
