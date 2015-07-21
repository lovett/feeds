var assert, events, setup, sqlite3;

sqlite3 = require('sqlite3').verbose();
setup = require('../../dispatcher/setup');
assert = require('assert');
events = require('events');

describe('setup handler', function() {
    'use strict';

    beforeEach(function () {
        this.db = new sqlite3.Database(':memory:');
        this.emitter = new events.EventEmitter();
        this.emitter.on('setup', setup);
    });

    afterEach(function () {
        this.db.close();
        this.emitter.removeAllListeners();
    });

    it('creates tables', function (done) {
        var self = this;

        self.emitter.on('setup:done', function () {
            var tables = ['feeds', 'entries', 'discussions'];
            tables.forEach(function (table) {
                self.db.get('SELECT COUNT(*) as count FROM ' + table, function (err, row) {
                    assert.strictEqual(err, null);
                    assert.strictEqual(row.count, 0);

                    if (table === tables[tables.length - 1]) {
                        done();
                    }
                });
            });
        });
        self.emitter.emit('setup', this.db);
    });
});
