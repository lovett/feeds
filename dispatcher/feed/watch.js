'use strict';

/**
 * Subscribe a user to one or more feeds.
 *
 * Subscription causes a feed to become eligible for polling.
 *
 * Polling is requested immediately after subscription creation to
 * minimize delay of the initial fetch.
 *
 */
module.exports = function (userId, feedIds, callback = () => {}) {
    const self = this;

    function done (err, ids) {
        callback(err, ids);
    }

    if (feedIds.length === 0) {
        done(new Error('no feed ids given'), []);
        return;
    }

    self.db.serialize(() => {
        self.db.run('BEGIN TRANSACTION');

        feedIds.forEach((feedId) => {
            self.db.run(
                'INSERT OR IGNORE INTO userFeeds (userId, feedId) VALUES (?, ?)',
                [userId, feedId],
                (err) => {
                    if (err) {
                        self.emit('log:error', `Failed to insert into userFeeds table: ${err.message}`);
                        return;
                    }
                }
            );
        });

        self.db.run('COMMIT', [], (err) => {
            if (feedIds.length > 0) {
                self.emit('feed:poll', true);
            }

            done(err, feedIds);
        });
    });
};
