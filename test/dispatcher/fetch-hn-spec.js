var MockFirebase, assert, events, fetchHn;

MockFirebase = require('mockfirebase').MockFirebase;
assert = require('assert');
events = require('events');
fetchHn = require('../../dispatcher/fetch/hn');

describe('Hacker News fetch handler', function() {
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
            time: new Date().getTime(),
            url: 'http://example.com'
        };

        self.hnTopStories.set([1]);
        self.hnFirebase.child('/item/1').set(story);

        self.emitter.once('entry', function (entryFeedId, entryFetchId, entryFields) {
            assert.strictEqual(entryFeedId, self.feedId);
            assert.strictEqual(entryFetchId, self.fetchId);
            assert.strictEqual(entryFields.title, story.title);
            assert.strictEqual(entryFields.createdUtcSeconds, story.time);
            assert.strictEqual(entryFields.url, story.url);
            assert.strictEqual(entryFields.discussion.tally, story.kids.length);
            assert.strictEqual(entryFields.discussion.url, 'https://news.ycombinator.com/item?id=1');
            assert.strictEqual(entryFields.discussion.label, 'Hacker News');
            done();
        });


        self.emitter.emit('fetch:hn', self.hnFirebase, self.feedId, self.fetchId, self.feedUrl);
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

        self.emitter.emit('fetch:hn', self.hnFirebase, self.feedId, self.fetchId, self.feedUrl);
        self.hnFirebase.flush();
    });

    it('handles stories without comments', function (done) {
        var self = this;

        self.hnTopStories.set([1]);

        self.hnFirebase.child('/item/1').set({
            title: 'test'
        });

        self.emitter.once('entry', function (entryFeedId, entryFetchId, entryFields) {
            assert.strictEqual(entryFields.discussion.tally, 0);
            done();
        });

        self.emitter.emit('fetch:hn', self.hnFirebase, self.feedId, self.fetchId, self.feedUrl);
        self.hnFirebase.flush();
    });

});
