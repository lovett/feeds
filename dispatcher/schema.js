'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Load SQL statements from an external file until the schema is
 * up-to-date.
 *
 * The schema is considered up-to-date once the requested version can
 * no longer be paired with an external file.
 *
 * SQL files are kept in the schema folder at the project root.
 *
 * Versions are expected to increment by whole numbers.
 */
module.exports = function(schemaRoot, version, callback) {
    const self = this;

    const sqlPath = path.join(
        schemaRoot,
        `${version.toString().padStart(3, 0)}.sql`
    );

    fs.stat(sqlPath, (err) => {
        if (err) {
            // The schema is up-to-date.
            callback(null);
            return;
        }

        fs.readFile(sqlPath, 'utf8', (_, data) => {
            self.db.exec(data, (err) => {
                if (err) {
                    self.emit('log:error', `Failed to load schema file: ${err.message}`);
                    callback(err);
                    return;
                }
                self.emit('schema', schemaRoot, version + 1, callback);
            });
        });
    });
};
