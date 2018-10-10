'use strict';

const nock = require('nock');
const assert = require('assert');
const events = require('events');
const path = require('path');
const fetchDefault = require('../../dispatcher/fetch/feed');

describe('fetch-feed', function() {

    beforeEach(function (done) {
        this.feedUrl = 'http://example.com/feed';
        this.feedId = 1;
        this.fetchId = 'fetch';
        this.requestMock = nock('http://example.com').get('/feed');
        this.emitter = new events.EventEmitter();
        this.emitter.on('fetch-feed', fetchDefault);
        done();
    });

    afterEach(function () {
        this.emitter.removeAllListeners();
    });

    it('triggers stat fetch on error', function (done) {
        this.emitter.on('stats:fetch', (feedId, fetchId, statusCode) => {
            assert.strictEqual(feedId, this.feedId);
            assert.strictEqual(statusCode, 0);
            done();
        });

        this.requestMock.replyWithError('fake error for testing');
        this.emitter.emit('fetch-feed', this.feedId, this.feedUrl);
    });

    it('triggers stat fetch on non-feed response', function (done) {
        this.requestMock.reply(200, '');

        this.emitter.on('stats:fetch', (feedId, fetchId, statusCode) => {
            assert.strictEqual(statusCode, 1);
        });

        this.emitter.emit('fetch-feed', this.feedId, this.feedUrl, (err) => {
            assert(err);
            done();
        });
    });

    it('triggers discussion recount', function (done) {
        const fixture = path.join(__dirname, 'fixtures', 'rss.xml');
        this.requestMock.replyWithFile(200, fixture, {
            'Content-Type': 'application/rss+xml'
        });

        this.emitter.on('discussion:recount', (feedUrl, guids) => {
            assert.strictEqual(feedUrl, this.feedUrl);
            assert.strictEqual(guids.length, 1);
            done();
        });

        this.emitter.emit('fetch-feed', this.feedId, this.feedUrl);
    });

    it('skips items without guids', function (done) {
        const fixture = path.join(__dirname, 'fixtures', 'rss-no-guid.xml');
        this.requestMock.replyWithFile(200, fixture, {
            'Content-Type': 'application/rss+xml'
        });

        this.emitter.on('discussion:recount', (feedUrl, guids) => {
            assert.strictEqual(feedUrl, this.feedUrl);
            assert.strictEqual(guids.length, 0);
            done();
        });

        this.emitter.emit('fetch-feed', this.feedId, this.feedUrl);
    });

    it('triggers entry storage on successful request', function (done) {
        let entryStoreCount = 0;
        let storedEntries = [];
        let storedGuids = [];

        const fixture = path.join(__dirname, 'fixtures', 'google-cloud.atom');
        this.requestMock.replyWithFile(200, fixture, {
            'Content-Type': 'applciation/atom+xml'
        });

        this.emitter.on('discussion:recount', (feedUrl, guids) => {
            assert.strictEqual(feedUrl, this.feedUrl);
            storedGuids = guids;
        });

        this.emitter.on('entry-store', (entry) => {
            storedEntries.push(entry);
        });

        this.emitter.emit('fetch-feed', this.feedId, this.feedUrl, (err) => {
            assert.ifError(err);
            assert.strictEqual(storedEntries.length, storedGuids.length);

            storedEntries.forEach((entry) => {
                assert.strictEqual(entry.feedUrl, this.feedUrl);
                assert.strictEqual(entry.feedId, this.feedId);
                assert(entry.fetchId);
            });
            done();
        });
    });

    it('recognized Slashdot-specific comment markup', function (done) {
        let entryStoreCount = 0;
        let storedEntries = [];
        let storedGuids = [];

        const fixture = path.join(__dirname, 'fixtures', 'slashdot.rdf');
        this.requestMock.replyWithFile(200, fixture, {
            'Content-Type': 'text/rdf'
        });

        this.emitter.on('discussion:recount', (feedUrl, guids) => {
            assert.strictEqual(feedUrl, this.feedUrl);
            storedGuids = guids;
        });

        this.emitter.on('entry-store', (entry) => {
            storedEntries.push(entry);
        });

        this.emitter.emit('fetch-feed', this.feedId, this.feedUrl, (err) => {
            assert.ifError(err);
            assert.strictEqual(storedEntries.length, storedGuids.length);

            const entry = storedEntries[0];

            assert.strictEqual(entry.feedUrl, this.feedUrl);
            assert.strictEqual(entry.feedId, this.feedId);
            assert(entry.fetchId);
            assert.strictEqual(entry.discussion.commentCount, 13);
            assert.ok(entry.extras.keywords.indexOf('business') > -1);
            assert.ok(entry.extras.keywords.indexOf('yro') > -1);
            done();
        });
    });

});
