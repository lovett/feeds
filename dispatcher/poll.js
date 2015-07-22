module.exports = function (db) {
    'use strict';

    var self = this;

    db.get('SELECT id, url, nextFetchUtc FROM feeds, userFeeds WHERE feeds.id=userFeeds.feedId AND strftime("%s", "now") - strftime("%s", nextFetchUtc) >= 0 ORDER BY nextFetchUtc ASC LIMIT 1', [], function (err, row) {

        if (err) {
            self.emit('log:error', 'Feed select query failed', {error: err});
            self.emit('poll:done');
            return;
        }

        if (!row) {
            self.emit('log:trace', 'Nothing to fetch at this time');
            self.emit('poll:done');
            return;
        }

        self.emit('fetch', row.id, row.url);

        db.run('UPDATE feeds SET nextFetchUtc=datetime(nextFetchUtc, "+1 hour") WHERE id=?', [row.id], function () {
            self.emit('poll:done', row.id, row.url);
        });
    });
};
