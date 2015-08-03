module.exports = function (db, filter) {
    'use strict';

    var self = this;

    if (filter.id) {
        db.run('UPDATE filters SET value=?, weight=?, feedId=? WHERE id=?', [filter.value, filter.weight, filter.feedId, filter.id], function (err) {
            if (err) {
                self.emit('log:error', 'Failed to update filter', { error: err, filter: filter});
                filter.updated = false;
            } else {
                filter.updated = true;
            }

            self.emit('filter:store:done', filter);
        });
    } else {
        db.run('INSERT INTO filters (userId, feedId, value, weight) VALUES (?, ?, ?, ?)', [filter.userId, filter.feedId, filter.value, filter.weight], function (err) {
            if (err) {
                self.emit('log:error', 'Failed to insert filter', {error: err, filter: filter});
                filter.id = null;
            } else {
                filter.id = this.lastID;
            }
            self.emit('filter:store:done', filter);
        });
    }
};
