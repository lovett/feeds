'use strict';

module.exports = function (userId, feedUrls, callback) {
    callback = (typeof callback === 'function') ? callback : function() {};

    const emitter = this;

    let feedsAdded = 0;
    let feedsSubscribed = 0;

    emitter.db.serialize(() => {
        emitter.db.run('BEGIN');

        for (let i=0; i < feedUrls.length; i++) {
            let feedUrl = feedUrls[i];
            emitter.db.run(
                'INSERT OR IGNORE INTO feeds (url) VALUES (?)',
                [feedUrl],
                function () {
                    feedsAdded += this.changes;
                }
            );

            emitter.db.run(
                'INSERT OR IGNORE INTO userFeeds (userId, feedId) VALUES (?, (SELECT id FROM feeds WHERE url=?))',
                [userId, feedUrl],
                function () {
                    feedsSubscribed += this.changes;
                }
            );
        }

        emitter.db.run('COMMIT', [], (err) => {
            callback(err, {
                feedsAdded: feedsAdded,
                feedsSubscribed: feedsSubscribed
            });
        });
    });
};
