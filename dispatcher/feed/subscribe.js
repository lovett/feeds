module.exports = function (db, feedUrl) {
    var self = this;

    db.run('INSERT OR IGNORE INTO feeds (url) VALUES (?)', [feedUrl], function (err) {
        if (err) {
            self.emit('log:error', err, __filename);
        }
        self.emit('feed:subscribe:done', this.changes, this.lastID, err);
    });
};
