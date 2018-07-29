'use strict';

const url = require('url');

module.exports = function (feeds, callback) {
    const self = this;

    let feedIds = [];

    self.db.serialize(() => {
        self.db.run('BEGIN');

        for (let i = 0; i < feeds.length; i++) {
            let feed = feeds[i];

            self.db.run(
                'INSERT OR IGNORE INTO feeds (url) VALUES (?)',
                [feed.url],
                (err, row) => {
                    if (err) {
                        return;
                    }
                }
            );

            self.db.get(
                'SELECT id FROM feeds WHERE url=?',
                [feed.url],
                (err, row) => {
                    if (err) {
                        callback(err);
                        return;
                    }

                    feedIds.push(row.id);

                    if (feed.title) {
                        self.db.run(
                            'UPDATE feeds SET title=? WHERE id=?',
                            [feed.title, row.id],
                            (err) => {
                                if (err) {
                                    callback(err);
                                }
                            }
                        );
                    }

                    if (!feed.title) {
                        const parsedUrl = url.parse(feed.url);

                        self.db.run(
                            'UPDATE feeds SET title=? WHERE id=? AND title IS NULL',
                            [parsedUrl.hostname, row.id],
                            (err) => {
                                if (err) {
                                    callback(err);
                                }
                            }
                        );
                    }
                }
            );
        };

        self.db.run('COMMIT', [], (err) => {
            if (err) {
                self.emit('log:error', `Failed to add feed: ${err.message}`);
                callback(err);
                return;
            }

            self.emit('feed:get', feedIds, (err, feeds) => {
                callback(err, feeds);
            });
        });
    });
};
