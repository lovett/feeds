'use strict';

module.exports = function (filterId, userId, callback) {

    const self = this;

    if (!filterId) {
        const message = 'No filter ID provided';
        self.emit('log:error', message);
        callback(new Error(message));
        return;
    }

    self.db.run(
        'DELETE FROM filters WHERE id=? AND userID=?',
        [filterId, userId],
        (err) => {
            if (err) {
                self.emit('log:error', `Failed to remove filter: ${err.message}`);
            }
            callback(err, filterId);
        }
    );
};
