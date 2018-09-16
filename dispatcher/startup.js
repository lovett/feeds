/** @module startup */
'use strict';

const sqlite3 = require('sqlite3');

/**
 * Callback for the startup event.
 *
 * @callback startupCallback
 * @param {error} [err] - Database error.
 */

/**
 * Connect to an SQLite database and update the schema.
 *
 * Dispatcher modules share a single database connection. This is
 * where that connection is opened (if not already open) and where
 * SQLite pragmas are set.
 *
 * @param {string|sqlite3.Database} database - A database path or an already-opened handle.
 * @param {string} schemaRoot - Filesystem path to the directory containing schema definitions.
 * @param {startupCallback} callback - A function to invoke on success or failure.
 * @event startup
 * @fires schema
 */
module.exports = function (database, schemaRoot, callback = () => {}) {
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
            (_, row) => {
                // Skipping error check here for lack of a way to check it.
                // If sqlite_master can't be queried, something is deeply broken.

                if (!row) {
                    self.emit('schema', schemaRoot, 1, callback);
                    return;
                }

                self.db.get('SELECT schemaVersion FROM versions', (err, row) => {
                    if (err) {
                        self.emit('log:error', `Determination of schema version failed: ${err.message}`);
                        callback(err);
                        return;
                    }

                    const currentVersion = parseInt(row.schemaVersion, 10);
                    self.emit('schema', schemaRoot, currentVersion + 1, callback);
                });
            }
        );
    });
};
