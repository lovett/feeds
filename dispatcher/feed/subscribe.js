module.exports = function (db, args) {
    'use strict';

    var self = this;

    function userFeedInsert() {
        db.run('INSERT OR IGNORE INTO userFeeds (userId, feedId) VALUES (?, (SELECT id FROM feeds WHERE url=?))', [args.userId, args.url], function (err) {
            if (err) {
                self.emit('log:error', 'Failed to insert into userFeeds table', { error: err, user: args.userId, url: args.url});
            }
        });
    }

    db.serialize(function () {
        db.run('BEGIN');
        db.run('INSERT OR IGNORE INTO feeds (url) VALUES (?)', [args.url], function (err) {
            var changes, lastId;

            if (err) {
                self.emit('log:error', 'Failed to insert into feeds table', {error: err, url: args.url});
            } else {
                changes = this.changes;
                lastId = this.lastID;
            }

            if (args.userId) {
                userFeedInsert();
            }

            self.emit('feed:subscribe:done', {
                'changes': changes,
                'lastId': lastId,
                error: err
            });
        });
        db.run('COMMIT');
    });
};
