'use strict';

module.exports = function (userId, feeds, callback) {
    callback = (typeof callback === 'function') ? callback : function() {};

    const emitter = this;

    let addCounter = 0;
    let subscribeCounter = 0;
    let titleCounter = 0;

    emitter.db.serialize(() => {
        emitter.db.run('BEGIN');

        feeds.forEach((feed) => {
            emitter.db.run(
                'INSERT OR IGNORE INTO feeds (url) VALUES (?)',
                [feed.url],
                function () {
                    addCounter += this.changes;
                }
            );

            emitter.db.run(
                'INSERT OR IGNORE INTO userFeeds (userId, feedId) VALUES (?, (SELECT id FROM feeds WHERE url=?))',
                [userId, feed.url],
                function (err) {
                    if (err) {
                        console.log(userId, feed);
                        console.log(err);
                    }
                    subscribeCounter += this.changes;
                }
            );

            if (feed.hasOwnProperty('title')) {
                emitter.db.run(
                    'UPDATE userFeeds SET title=? WHERE userId=? AND feedId=(SELECT id FROM feeds WHERE url=?)',
                    [feed.title, userId, feed.url],
                    function () {
                        titleCounter += this.changes;
                    }
                );
            }
        });

        emitter.db.run('COMMIT', [], (err) => {
            callback(err, {
                feedsAdded: addCounter,
                subscriptionsCreated: subscribeCounter,
                titlesSet: titleCounter
            });
        });
    });
};
