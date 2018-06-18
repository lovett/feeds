'use strict';

/**
 * Record the fetch id and HTTP status of a feed fetch.
 *
 * Knowing this makes it possible to track a feed's liveliness over
 * time.
 */
module.exports = function (feedId, fetchid, httpStatus) {
    var self = this;

    self.db.run(
        'INSERT INTO fetchStats (feedId, fetchid, httpStatus) VALUES (?, ?, ?)',
        [feedId, fetchid, httpStatus],
        function (err) {
            var changes, lastID;

            if (err) {
                self.emit('log:error', `Failed to insert into fetchStats table: ${err.message}`);
                return;
            }

            if (httpStatus !== 200) {
                self.emit('feed:assess', feedId);
            }

            self.emit('stats:fetch:done');
        }
    );
};
