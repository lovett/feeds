'use strict';

const sqlite3 = require('sqlite3');

/**
 * Connect to an SQLite database and declare a schema.
 *
 * The dispatcher uses a single shared database connection. Schema
 * definition and upgrade is handled elsewhere, but this is where
 * SQLite pragmas are set.
 */
module.exports = function (database) {
    const self = this;

    if (database instanceof sqlite3.Database) {
        self.db = database;
    } else {
        self.db = new sqlite3.Database(database);
    }

    self.db.serialize(() => {
        self.db.run('PRAGMA foreign_keys=1');

        self.db.get(
            'SELECT name FROM sqlite_master WHERE type="table" AND name="versions"',
            [],
            (err, row) => {
                if (err) {
                    self.emit('log:error', `Test for existence of versions table failed: ${err.message}`);
                    return;
                }

                if (!row) {
                    self.emit('schema', 1);
                    self.emit('startup:done');
                    return;
                }

                self.db.get('SELECT schemaVersion FROM versions', [], (err, row) => {
                    if (err) {
                        self.emit('log:error', `Determination of schema version failed: ${err.message}`);
                        return;
                    }

                    self.emit('schema', parseInt(row['schemaVersion'], 10) + 1);

                    self.emit('startup:done');
                });
            }
        );
    });
};
