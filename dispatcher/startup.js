'use strict';

const sqlite3 = require('sqlite3');

/**
 * Connect to an SQLite database and update the schema.
 *
 * There is a single database connection shared by all dispatcher
 * modules. Although schema changes are performed elsehwere, this
 * is where SQLite pragmas are set.
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

        self.db.get(
            'SELECT name FROM sqlite_master WHERE type="table" AND name="versions"',
            (_, row) => {
                // Skipping error check here for lack of a way to check it.
                // If sqlite_master can't be queried, something is deeply broken.

                if (!row) {
                    self.emit('schema', 1, callback);
                    return;
                }

                self.db.get('SELECT schemaVersion FROM versions', (err, row) => {
                    if (err) {
                        self.emit('log:error', `Determination of schema version failed: ${err.message}`);
                        callback();
                        return;
                    }

                    const currentVersion = parseInt(row.schemaVersion, 10);
                    self.emit('schema', currentVersion + 1, callback);
                });
            }
        );
    });
};
