'use strict';

const sqlite3 = require('sqlite3').verbose();
const startup = require('../../dispatcher/startup');
const schema = require('../../dispatcher/schema');
const assert = require('assert');
const sinon = require('sinon');
const events = require('events');
const path = require('path');

/**
 * Unlike other tests, this one uses two database configurations.
 *
 * The dbConfig string mimics how the server initializes the database.
 * The db instance is testing-centric, and provides a way to manipulate
 * the database before and during a test.
 */
describe('startup', function() {

    beforeEach(function () {
        this.schemaRoot = path.join(__dirname, '../../', 'schema');
        this.db = new sqlite3.Database(':memory:');
        this.dbConfig = ':memory:';
        this.emitter = new events.EventEmitter();
        this.emitter.on('startup', startup);
        this.emitter.on('schema', schema);
    });

    afterEach(function () {
        this.db.close();
        this.emitter.removeAllListeners();
    });

    /**
     * If startup is called with a string, database instantiation is
     * performed internally.
     *
     * The instance instantiated during beforeEach() is not used here.
     */
    it('creates a database instance from a DSN string', function (done) {
        const self = this;

        self.emitter.emit('startup', self.dbConfig, self.schemaRoot, (err) => {
            assert.strictEqual(null, err);
            assert.ok(self.emitter.db instanceof sqlite3.Database);
            done();
        });
    });

    /**
     * SQLite pragmas are declared by startup.
     */
    it('sets foreign_keys pragma', function (done) {
        const self = this;

        self.emitter.emit('startup', self.dbConfig, self.schemaRoot, (err) => {
            assert.strictEqual(null, err);

            self.emitter.db.get('PRAGMA foreign_keys', (err, row) => {
                if (err) {
                    throw err;
                }

                assert.strictEqual(row.foreign_keys, 1);
                done();
            });
        });
    });

    /**
     * If there is no file for the next version number, the existing value
     * should remain intact.
     */
    it('finishes schema upgrade when no file present', function (done) {
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
                    self.emitter.emit('startup', self.db, self.schemaRoot, (err) => {
                        assert.strictEqual(null, err);
                        self.db.get(
                            'SELECT schemaVersion FROM versions',
                            (err, row) => {
                                assert.strictEqual(row.schemaVersion, initialVersion);
                                done();
                            }
                        );
                    });
                }
            );
        });
    });

    /**
     * If the current version can't be determined, no further action
     * is taken but the callback is still invoked.
     *
     * This is a contrived test for the sake of thoroughness.
     */
    it('handles failure to determine version', function (done) {
        const self = this;

        self.db.serialize(() => {
            self.db.run('CREATE TABLE versions (bogus INTEGER DEFAULT 1)', (err) => {
                self.emitter.emit('startup', self.db, self.schemaRoot, () => {
                    self.db.get(
                        'SELECT count(*) as count FROM versions',
                        (err, row) => {
                            assert.strictEqual(row.count, 0);
                            done();
                        }
                    );
                });
            });
        });
    });

});
