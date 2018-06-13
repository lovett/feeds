'use strict';

/**
 * Record the details of a feed fetch.
 *
 * Knowing the HTTP status code and item count over time
 * makes it easier to identify problems and track liveliness.
 */
module.exports = function (feedId, fetchid, httpStatus, itemCount) {
    var self = this;

    self.db.run(
        'INSERT INTO fetchStats (feedId, fetchid, httpStatus, itemCount) VALUES (?, ?, ?, ?)',
        [feedId, fetchid, httpStatus, itemCount],
        function (err) {
            var changes, lastID;

            if (err) {
                self.emit('log:error', `Failed to insert into fetchStats table: ${err.message}`);
                return;
            }

            self.emit('stats:fetch:done');
        }
    );
};
