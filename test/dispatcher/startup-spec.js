const sqlite3 = require('sqlite3').verbose();
const startup = require('../../dispatcher/startup');
const assert = require('assert');
const sinon = require('sinon');
const events = require('events');

describe('startup', function() {
    'use strict';

    beforeEach(function () {
        const self = this;
        self.db = new sqlite3.Database(':memory:');
        self.emitter = new events.EventEmitter();
        self.emitter.on('startup', startup);
    });

    afterEach(function () {
        const self = this;
        self.db.close();
        self.emitter.removeAllListeners();
    });

    it('creates tables', function (done) {
        const self = this;

        self.emitter.on('startup:done', function () {
            const tables = [
                'feeds',
                'entries',
                'discussions',
                'users',
                'userFeeds',
                'userEntries',
                'history',
                'filters',
                'userEntryFilters'
            ];

            tables.forEach(function (table) {
                self.db.get(
                    'SELECT COUNT(*) as total from sqlite_master WHERE type="table" AND name=?',
                    [table],
                    function (err, row) {
                        assert.strictEqual(err, null);
                        assert.strictEqual(row.total, 1);

                        if (table === tables[tables.length - 1]) {
                            done();
                        }
                    }
                );
            });
        });
        self.emitter.emit('startup', self.db);
    });

    it('enforces foreign keys', function (done) {
        const self = this;

        self.emitter.on('startup:done', function () {
            self.db.get('PRAGMA foreign_keys', function (err, row) {
                if (err) {
                    throw err;
                }

                assert.strictEqual(row.foreign_keys, 1);
                done();
            });
        });

        self.emitter.emit('startup', self.db);
    });
});
