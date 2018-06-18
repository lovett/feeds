'use strict';

module.exports = function (filter) {

    const self = this;

    if (!filter.id) {
        self.emit('log:error', 'Cannot remove filter without an id');
        self.emit('filter:remove:done');
        return;
    }

    self.db.run(
        'DELETE FROM filters WHERE id=? AND userID=? AND feedId=?',
        [filter.id, filter.userId, filter.feedId],
        (err) => {
            if (err) {
                self.emit('log:error', `Failed to remove filter: ${err.message}`);
            }
            self.emit('filter:remove:done');
        }
    );
};
