module.exports = function (db, feedUrl, userId) {
    'use strict';

    var self = this;

    function userFeedInsert() {
        db.run('INSERT OR IGNORE INTO userFeeds (userId, feedId) VALUES (?, (SELECT id FROM feeds WHERE url=?))', [userId, feedUrl], function (err) {
            if (err) {
                self.emit('log:error', 'Failed to insert into userFeeds table', { error: err, user: userId, url: feedUrl});
            }
        });
    }

    db.serialize(function () {
        db.run('BEGIN');
        db.run('INSERT OR IGNORE INTO feeds (url) VALUES (?)', [feedUrl], function (err) {
            var changes, lastId;

            if (err) {
                self.emit('log:error', 'Failed to insert into feeds table', {error: err, url: feedUrl});
            } else {
                changes = this.changes;
                lastId = this.lastID;
            }

            if (userId) {
                userFeedInsert();
            }

            self.emit('feed:subscribe:done', changes, lastId, err);
        });
        db.run('COMMIT');
    });
};
