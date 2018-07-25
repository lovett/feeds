'use strict';

const url = require('url');

module.exports = function (feeds, callback) {
    callback = (typeof callback === 'function') ? callback : function() {};

    const emitter = this;

    let addCounter = 0;
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

            if (feed.title) {
                emitter.db.run(
                    'UPDATE feeds SET title=? WHERE id=(SELECT id FROM feeds WHERE url=?)',
                    [feed.title, feed.url],
                    function () {
                        titleCounter += this.changes;
                    }
                );
            } else {
                const paredUrl = url.parse(feed.url);

                emitter.db.run(
                    'UPDATE feeds SET title=? WHERE id=(SELECT id FROM feeds WHERE url=?) AND title IS NULL',
                    [parsedUrl.hostname],
                    function () {
                        titleCounter += this.changes;
                    }
                );
            }
        });

        emitter.db.run('COMMIT', [], (err) => {
            callback(err, {
                feedsAdded: addCounter,
                titlesSet: titleCounter
            });
        });
    });
};
