'use strict';

const sqlite3 = require('sqlite3').verbose();
const startup = require('../../dispatcher/startup');
const assert = require('assert');
const sinon = require('sinon');
const events = require('events');

describe('startup', function() {

    beforeEach(function () {
        const self = this;
        self.db = new sqlite3.Database(':memory:');
        self.emitter = new events.EventEmitter();
        self.emitter.on('startup', startup);
    });

    afterEach(function () {
        this.db.close();
        this.emitter.removeAllListeners();
    });

    it('creates a database instance from a DSN string', function (done) {
        const self = this;

        self.emitter.on('startup:done', function () {
        });
        self.emitter.emit('startup', ':memory:', (conn) => {
            assert.ok(conn instanceof sqlite3.Database);
            done();
        });
    });

    it('sets foreign_keys pragma', function (done) {
        const self = this;

        self.emitter.on('startup:done', function () {
            self.db.get('PRAGMA foreign_keys', (err, row) => {
                if (err) {
                    throw err;
                }

                assert.strictEqual(row.foreign_keys, 1);
                done();
            });
        });

        self.emitter.emit('startup', self.db);
    });

    it('triggers schema upgrades', function (done) {
        const self = this;
        const initialVersion = 100;

        self.emitter.on('schema', (version) => {
            assert.strictEqual(version, initialVersion + 1);
            done();
        });

        self.db.serialize(() => {
            self.db.run('CREATE TABLE versions (schemaVersion INTEGER DEFAULT 1)');
            self.db.run(
                `INSERT INTO versions (schemaVersion) VALUES (${initialVersion})`,
                (err) => {
                    if (err) {
                        throw err;
                    }
                    self.emitter.emit('startup', self.db);
                }
            );
        });
    });

    it('invokes callback after schema upgrade', function (done) {
        const self = this;
        const initialVersion = 100;

        self.db.serialize(() => {
            self.db.run('CREATE TABLE versions (schemaVersion INTEGER DEFAULT 1)');
            self.db.run(
                `INSERT INTO versions (schemaVersion) VALUES (${initialVersion})`,
                (err) => {
                    if (err) {
                        throw err;
                    }

                    self.emitter.emit('startup', self.db, (conn) => {
                        assert.ok(conn instanceof sqlite3.Database);
                        done();
                    });
                }
            );
        });
    });

    it('handles failure to determine version', function (done) {
        const self = this;
        const initialVersion = 100;

        self.db.serialize(() => {
            self.db.run('CREATE TABLE versions (bogus INTEGER DEFAULT 1)', (err) => {
                if (err) {
                    throw err;
                }

                self.emitter.emit('startup', self.db, (conn, currentVersion) => {
                    assert.ok(conn instanceof sqlite3.Database);
                    assert.strictEqual(currentVersion, undefined);
                    done();
                });
            });
        });
    });

});
