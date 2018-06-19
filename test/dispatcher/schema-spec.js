'use strict';

const sqlite3 = require('sqlite3').verbose();
const startup = require('../../dispatcher/startup');
const schema = require('../../dispatcher/schema');
const assert = require('assert');
const sinon = require('sinon');
const events = require('events');

describe('schema', function() {

    beforeEach(function () {
        this.db = new sqlite3.Database(':memory:');
        this.emitter = new events.EventEmitter();
        this.emitter.on('startup', startup);
    });

    afterEach(function () {
        this.db.close();
        this.emitter.removeAllListeners();
    });

    it('creates tables', function (done) {
        const self = this;

        self.emitter.on('schema:done', function () {
            const tables = [
                'discussions',
                'entries',
                'feeds',
                'fetchStats',
                'filters',
                'userEntries',
                'userEntryFilters',
                'userFeeds',
                'users'
            ];

            tables.forEach(function (table) {
                self.db.get(
                    'SELECT COUNT(*) as total from sqlite_master WHERE type="table" AND name=?',
                    [table],
                    function (err, row) {
                        if (err) {
                            throw err;
                        }
                        assert.strictEqual(row.total, 1, table);

                        if (table === tables[tables.length - 1]) {
                            done();
                        }
                    }
                );
            });
        });
        self.emitter.on('schema', schema);
        self.emitter.emit('startup', self.db);
    });

    it('uses recursion', function (done) {
        const self = this;
        let invocationCount = 0;
        self.emitter.on('schema', () => {
            invocationCount += 1;

            if (invocationCount == 2) {
                done();
            }
        });
        self.emitter.on('schema', schema);
        self.emitter.emit('startup', self.db);

    });
});
