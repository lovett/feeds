'use strict';

const sqlite3 = require('sqlite3').verbose();
const startup = require('../../dispatcher/startup');
const schema = require('../../dispatcher/schema');
const feedUpdate = require('../../dispatcher/feed/update');
const assert = require('assert');
const events = require('events');
const path = require('path');

describe('feed-update', function() {

    beforeEach(function (done) {
        const self = this;
        const schemaRoot = path.join(__dirname, '../../', 'schema');
        const fixtureRoot = path.join(__dirname, 'fixtures', 'feed-subscribed');
        this.entryUrl = 'http://example.com/entry.html';
        this.db = new sqlite3.Database(':memory:');
        this.emitter = new events.EventEmitter();
        this.emitter.unlisten = function () {};
        this.emitter.on('feed-update', feedUpdate);
        this.emitter.on('startup', startup);
        this.emitter.on('schema', schema);
        this.feedId = 200;

        this.emitter.emit('startup', this.db, schemaRoot, () => {
            this.emitter.emit('schema', fixtureRoot, 2, done);
        });
    });

    afterEach(function () {
        this.db.close();
        this.emitter.removeAllListeners();
    });

    it('updates a single field', function (done) {
        const newTitle = 'new title';

        this.emitter.emit('feed-update', this.feedId, {title: newTitle}, (err) => {
            assert.ifError(err);

            this.db.get(
                'SELECT title, updated FROM feeds WHERE id=?',
                [this.feedId],
                (err, row) => {
                    if (err) {
                        throw err;
                    }
                    assert.strictEqual(row.title, newTitle);
                    assert(row.updated);
                    done();
                }
            );
        });
    });

    it('updates multiple fields', function (done) {
        const newSiteUrl = 'http://example.com';
        const newDescription = 'test';

        this.emitter.emit('feed-update', this.feedId, {
            siteUrl: newSiteUrl,
            description: newDescription
        }, (err) => {
            assert.ifError(err);

            this.db.get(
                'SELECT siteUrl, description, updated FROM feeds WHERE id=?',
                [this.feedId],
                (err, row) => {
                    if (err) {
                        throw err;
                    }
                    assert.strictEqual(row.siteUrl, newSiteUrl);
                    assert.strictEqual(row.description, newDescription);
                    assert(row.updated);
                    done();
                }
            );
        });
    });

    it('updates the feed url to a yet-unseen value', function (done) {
        const newUrl = 'http://example.com/new';

        this.emitter.emit('feed-update', this.feedId, {url: newUrl}, (err) => {
            assert.ifError(err);

            this.db.get(
                'SELECT url, updated FROM feeds WHERE id=?',
                [this.feedId],
                (err, row) => {
                    if (err) {
                        throw err;
                    }
                    assert.strictEqual(row.url, newUrl);
                    assert(row.updated);
                    done();
                }
            );
        });
    });

    it('ignores invalid property', function (done) {
        this.emitter.emit(
            'feed-update',
            this.feedId,
            {'invalid': 'whatever'},
            (err) => {
                assert.ifError(err);
                done();
            }
        );
    });
});
