'use strict';

const sqlite3 = require('sqlite3').verbose();
const startup = require('../../dispatcher/startup');
const schema = require('../../dispatcher/schema');
const assert = require('assert');
const sinon = require('sinon');
const events = require('events');

describe('schema', function() {

    beforeEach(function (done) {
        const self = this;
        this.db = new sqlite3.Database(':memory:');
        this.emitter = new events.EventEmitter();
        this.emitter.on('startup', startup);
        this.emitter.on('schema', schema);
        this.emitter.emit('startup', self.db, done);
    });

    afterEach(function () {
        this.db.close();
        this.emitter.removeAllListeners();
    });

    it('creates tables', function (done) {
        const self = this;

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
});
