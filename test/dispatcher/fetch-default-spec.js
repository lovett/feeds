'use strict';

const nock = require('nock');
const assert = require('assert');
const events = require('events');
const fetchDefault = require('../../dispatcher/fetch/default');

describe('fetch:default', function() {

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

    it('handles non-feed URL', function (done) {
        this.requestMock.reply(200, { data: {} });

        this.emitter.on('stats:fetch', (feedId, fetchId, statusCode, callback) => {
            assert.strictEqual(statusCode, 0);
            done();
        });

        this.emitter.emit('fetch:default', this.feedId, this.feedUrl, (err) => {
            assert(err);
        });
    });
});
