'use strict';

/**
 * Record the fetch id and HTTP status of a feed fetch.
 *
 * Knowing this makes it possible to track a feed's liveliness over
 * time.
 */
module.exports = function (feedId, fetchid, httpStatus, callback = () => {}) {
    var self = this;

    self.db.run(
        'INSERT INTO fetchStats (feedId, fetchid, httpStatus) VALUES (?, ?, ?)',
        [feedId, fetchid, httpStatus],
        function (err) {
            if (err) {
                self.emit('log:error', `Failed to insert into fetchStats table: ${err.message}`);
                callback(err);
                return;
            }

            if (httpStatus !== 200) {
                self.emit('feed-assess', feedId);
            }

            callback(null, this.lastID);
        }
    );
};
