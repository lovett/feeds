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
module.exports = function(version) {
    const self = this;

    const sqlPath = path.join(
        path.dirname(process.argv[1]),
        '../',
        'schema',
        `${version.toString().padStart(3, 0)}.sql`
    );

    fs.stat(sqlPath, (err) => {
        if (err) {
            self.emit('schema:done');
            return;
        }

        fs.readFile(sqlPath, 'utf8', (err, data) => {
            if (err) {
                self.emit('log:error', `Failed to read ${sqlPath}: ${err.message}`);
                return;
            }

            self.db.exec(data, (err) => {
                if (err) {
                    self.emit('log:error', `Failed to load schema file: ${err.message}`);
                    return;
                }
            });

            self.emit('schema', version + 1);
        });
    });
};
