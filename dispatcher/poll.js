module.exports = function (db) {
    'use strict';

    var oneHourSeconds, self;

    oneHourSeconds = 60 * 60;
    self = this;


    db.get('SELECT id, url, nextFetchUtcSeconds FROM feeds, userFeeds WHERE feeds.id=userFeeds.feedId AND (strftime("%s", "now") - nextFetchUtcSeconds >= 0 OR nextFetchUtcSeconds IS NULL) ORDER BY nextFetchUtcSeconds ASC LIMIT 1', [], function (err, row) {
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

        if (row.nextFetchUtcSeconds) {
            row.nextFetchUtcSeconds += oneHourSeconds;
        } else {
            row.nextFetchUtcSeconds = new Date().getTime() + oneHourSeconds;
        }

        db.run('UPDATE feeds SET nextFetchUtcSeconds=? WHERE id=?', [row.nextFetchUtcSeconds, row.id], function () {
            self.emit('poll:done', row.id, row.url);
        });

        self.emit('fetch', row.id, row.url);

    });
};
