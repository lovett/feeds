module.exports = function (db, feedUrl) {
    'use strict';

    var self = this;

    db.run('INSERT OR IGNORE INTO feeds (url) VALUES (?)', [feedUrl], function (err) {
        if (err) {
            self.emit('log:error', 'Failed to insert into feeds table', {error: err, url: feedUrl});
        }
        self.emit('feed:subscribe:done', this.changes, this.lastID, err);
    });
};
