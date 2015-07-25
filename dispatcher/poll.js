module.exports = function (db) {
    'use strict';

    var nowSeconds, oneHourSeconds, self;
    nowSeconds = new Date().getTime() / 1000;
    oneHourSeconds = 60 * 60;
    self = this;

    db.get('SELECT id, url, nextFetchUtcSeconds FROM feeds, userFeeds WHERE feeds.id=userFeeds.feedId ORDER BY nextFetchUtcSeconds ASC LIMIT 1', [], function (err, feed) {

        if (err) {
            self.emit('log:error', 'Feed select query failed', {error: err});
            self.emit('poll:done');
            return;
        }

        if (!feed) {
            self.emit('log:trace', 'Nothing to fetch at this time');
            self.emit('poll:done');
            return;
        }

        // Use the most recent entry to decide how frequently to check the feed
        db.get('SELECT createdUtcSeconds FROM entries WHERE feedId=? ORDER BY createdUtcSeconds DESC LIMIT 1', [feed.id], function (entryErr, entry) {
            if (entryErr) {
                self.emit('log:error', 'Entry select query failed', { error: entryErr});
            }

            if (entry && nowSeconds - entry.createdUtcSeconds >= (oneHourSeconds * 4)) {
                feed.nextFetchUtcSeconds = nowSeconds + (oneHourSeconds * 24);
            } else {
                feed.nextFetchUtcSeconds = nowSeconds + oneHourSeconds;
            }

            db.run('UPDATE feeds SET nextFetchUtcSeconds=? WHERE id=?', [feed.nextFetchUtcSeconds, feed.id], function () {
                self.emit('poll:done', feed.id, feed.url, feed.nextFetchUtcSeconds);
            });
        });

        self.emit('fetch', feed.id, feed.url);

    });
};
