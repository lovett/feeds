'use strict';

/**
 * Associate one or more feeds with a user, making it eligible for polling.
 *
 * The feed will be added if it doesn't already exist.
 */
module.exports = function (userId, feeds, callback) {
    const self = this;

    let addCounter = 0;
    let subscribeCounter = 0;
    let titleCounter = 0;

    self.db.serialize(() => {
        self.db.run('BEGIN TRANSACTION');

        feeds.forEach((feed) => {
            self.db.run(
                'INSERT OR IGNORE INTO feeds (url) VALUES (?)',
                [feed.url],
                function (err) {
                    if (err) {
                        self.emit('log:error', `Failed insert into feeds table: ${err.message}`);
                        return;
                    }
                    addCounter += this.changes;
                }
            );

            self.db.run(
                'INSERT OR IGNORE INTO userFeeds (userId, feedId) VALUES (?, (SELECT id FROM feeds WHERE url=?))',
                [userId, feed.url],
                function (err) {
                    if (err) {
                        self.emit('log:error', `Failed to insert into userFeeds table: ${err.message}`);
                        return;
                    }
                    subscribeCounter += this.changes;
                }
            );

            if (feed.title) {
                self.db.run(
                    'UPDATE userFeeds SET title=? WHERE userId=? AND feedId=(SELECT id FROM feeds WHERE url=?)',
                    [feed.title, userId, feed.url],
                    function (err) {
                        if (err) {
                            self.emit('log:error', `Failed to update feed title: ${err.message}`);
                            return;
                        }
                        titleCounter += this.changes;
                    }
                );
            }
        });

        self.db.run('COMMIT', [], (err) => {
            if (err) {
                self.emit('log:error', `Failed to commit feed transaction: ${err.message}`);
                return;
            }

            if (addCounter > 0 && subscribeCounter > 0) {
                self.emit('feed:poll');
            }

            if (callback) {
                callback(err, {
                    feedsAdded: addCounter,
                    subscriptionsCreated: subscribeCounter,
                    titlesSet: titleCounter
                });
            }
        });
    });
};
