'use strict';

/**
 * Determine whether a feed should be abandonned.
 *
 * A feed is abandonned if more than 3 fetch attempts have returned
 * with a status of 400 or greater.
 *
 * A feed is also abandonned if it has been successfully requested at
 * least three times but not produced any entries.
 */
module.exports = function (feedId) {
    const self = this;
    const threshold = 3;

    const abandonFeed = () => {
        self.db.run(
            'UPDATE feeds SET nextFetch=null, abandonned=datetime("now") WHERE id=?',
            [feedId],
            function (err) {
                if (err) {
                    self.emit('log:error', `Failed to mark feed abandonned: ${err.message}`);
                    return;
                }
            }
        );
    };

    self.db.all(
        'SELECT httpStatus, count(*) as total FROM fetchStats WHERE feedId=?',
        [feedId],
        function (err, rows) {
            if (err) {
                self.emit('log:error', `Failed to select from fetchStats table: ${err.message}`);
                return;
            }

            let fetchCount = 0;
            let errorCount = 0;

            rows.forEach((row) => {
                const status = parseInt(row.httpStatus, 10);
                const count = parseInt(row.total, 10);
                if (status >= 400) {
                    errorCount += count;
                }

                fetchCount += count;
            });

            if (errorCount > threshold) {
                self.emit(
                    'log:debug',
                    `Abandonning feed ${feedId} based on HTTP status`
                );
                abandonFeed();
                self.emit('feed:assess:done');
                return;
            }

            self.db.get(
                'SELECT count(*) as total FROM entries WHERE feedId=?',
                [feedId],
                function (err, row) {
                    if (err) {
                        self.emit(
                            'log:error',
                            `Failed to select from entries table: ${err.message}`
                        );
                        return;
                    }

                    if (parseInt(row.total, 10) === 0 && fetchCount > threshold) {
                        self.emit(
                            'log:debug',
                            `Abandonning feed ${feedId} based on entry count`
                        );
                        abandonFeed();
                        self.emit('feed:assess:done');
                        return;
                    }
                }
            );
        }
    );
};
