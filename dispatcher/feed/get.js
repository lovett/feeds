'use strict';

const url = require('url');

module.exports = function (feedIds, callback) {
    const self = this;

    const done = (err, feeds) => {
        self.emit('feed:get:done', err, feeds);
        if (callback) {
            callback(err, feeds);
        }
    };

    const placeholders = feedIds.map(_ => '?').join(',');

    self.db.all(
        `SELECT id, url, title, description, siteUrl, created, updated, abandonned, nextFetch
         FROM feeds
         WHERE id in (${placeholders})`,
        feedIds,
        (err, rows) => {
            if (err) {
                self.emit('log:error', `Failed to select feeds after add: ${err.message}`);
            }

            done(err, rows);
        }
    );
};
