'use strict';

const url = require('url');

module.exports = function (feeds, callback) {
    const self = this;

    let feedIds = [];

    const done = (err, feeds) => {
        self.emit('feed:add:done', err, feeds);
        if (callback) {
            callback(err, feeds);
        }
    };

    self.db.serialize(() => {
        self.db.run('BEGIN');

        feeds.forEach((feed) => {
            self.db.run(
                'INSERT OR IGNORE INTO feeds (url) VALUES (?)',
                [feed.url],
                (err) => {
                    if (err) {
                        done(err, []);
                    }
                }
            );

            self.db.get(
                'SELECT id FROM feeds WHERE url=?',
                [feed.url],
                (err, row) => {
                    if (err) {
                        done(err, []);
                        return;
                    }

                    feedIds.push(row.id);

                    if (feed.title) {
                        self.db.run(
                            'UPDATE feeds SET title=? WHERE id=?',
                            [feed.title, row.id],
                            (err) => {
                                if (err) {
                                    done(err, []);
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
                                    done(err, []);
                                }
                            }
                        );
                    }
                }
            );
        });

        self.db.run('COMMIT', [], (err) => {
            if (err) {
                self.emit('log:error', `Failed to add feed: ${err.message}`);
                done(err, []);
                return;
            }

            self.emit('feed:get', feedIds, (err, feeds) => {
                done(err, feeds);
            });
        });
    });
};
