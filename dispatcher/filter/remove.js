'use strict';

module.exports = function (filterId, userId, callback) {

    const self = this;

    if (!filterId) {
        self.emit('log:error', 'No filter ID provided');
        self.emit('filter:remove:done', null);
        if (callback) {
            callback(null);
        }
        return;
    }

    self.db.run(
        'DELETE FROM filters WHERE id=? AND userID=?',
        [filterId, userId],
        (err) => {
            if (err) {
                self.emit('log:error', `Failed to remove filter: ${err.message}`);
                self.emit('filter:remove:done', null);
                if (callback) {
                    callback(null);
                }
                return;
            }

            self.emit('filter:remove:done', filterId);

            if (callback) {
                callback(filterId);
                return;
            }
        }
    );
};
