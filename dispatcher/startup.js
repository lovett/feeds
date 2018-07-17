'use strict';

const sqlite3 = require('sqlite3');

/**
 * Connect to an SQLite database and declare a schema.
 *
 * The dispatcher uses a single shared database connection. Schema
 * definition and upgrade is handled elsewhere, but this is where
 * SQLite pragmas are set.
 */
module.exports = function (database, callback) {
    const self = this;

    if (database instanceof sqlite3.Database) {
        self.db = database;
    } else {
        self.db = new sqlite3.Database(database);
    }

    self.db.serialize(() => {
        self.db.run('PRAGMA foreign_keys=1');

        self.once('schema:done', function () {
            self.emit('startup:done');
            if (callback) {
                callback(self.db, 0);
            }
        });

        self.db.get(
            'SELECT name FROM sqlite_master WHERE type="table" AND name="versions"',
            (_, row) => {
                // Skipping error check here for lack of a way to check it.
                // If sqlite_master can't be queried, something is deeply broken.

                if (!row) {
                    self.emit('schema', 1);
                    return;
                }

                self.db.get('SELECT schemaVersion FROM versions', (err, row) => {
                    if (err) {
                        self.emit('log:error', `Determination of schema version failed: ${err.message}`);
                        self.emit('startup:done');
                        callback(self.db, undefined);
                        return;
                    }

                    const currentVersion = parseInt(row.schemaVersion, 10);
                    self.emit('schema', currentVersion + 1);
                });
            }
        );
    });

    return self.db;
};
