'use strict';

/**
 * Associate an entry with users subscribed to the entry's feed.
 */
module.exports = function (entryId, feedId) {
    const self = this;

    self.db.all('SELECT userId from userFeeds WHERE feedId=?', [feedId], function (err, rows) {

        if (err) {
            self.emit('log:error', `Failed to select user from userFeeds table: ${err.message}`);
            return;
        }

        for (let i=0; i < rows.length; i++) {
            const row = rows[i];
            const isLast = (i === rows.length - 1);

            self.db.run(
                'INSERT OR IGNORE INTO userEntries (userId, entryId) VALUES (?, ?)',
                [row.userId, entryId],
                (err) => {
                    if (err) {
                        self.emit(
                            'log:error',
                            `Failed to insert into userEntries table: ${err.message}`
                        );
                        return;
                    }

                    self.emit('filter:apply', entryId, row.userId);

                    if (isLast) {
                        self.emit('entry:assign:done', entryId, feedId);
                    }
                }
            );
        }
    });
};
