module.exports = function (db, filter) {
    'use strict';

    var self = this;

    if (!filter.id) {
        self.emit('log:error', 'Cannot remove filter without an id', { filter: filter});
        filter.removed = false;
        self.emit('filter:remove:done', filter);
        return;
    }

    db.run('DELETE FROM filters WHERE id=? AND userID=? AND feedId=?', [filter.id, filter.userId, filter.feedId], function (err) {
        if (err) {
            self.emit('log:error', 'Failed to remove filter', { error: err, filter: filter});
            filter.removed = false;
        } else {
            filter.removed = true;
        }

        self.emit('filter:remove:done', filter);
    });
};
