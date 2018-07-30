'use strict';

module.exports = function (userId, filter, callback = () => {}) {

    const self = this;

    if (filter.id) {
        self.db.run(
            'UPDATE filters SET value=?, weight=?, feedId=? WHERE id=?',
            [filter.value, filter.weight, filter.feedId, filter.id],
            (err) => {
                if (err) {
                    self.emit(
                        'log:error',
                        `Failed to update filter: ${err.message}`
                    );
                    callback(err, null);
                    return;
                }

                callback(null, filter);
            }
        );

        return;
    }

    self.db.run(
        'INSERT INTO filters (userId, feedId, value, weight) VALUES (?, ?, ?, ?)',
        [userId, filter.feedId, filter.value, filter.weight],
        function (err) {
            if (err) {
                self.emit(
                    'log:error',
                    `Failed to insert filter: ${err.message}`
                );

                callback(err, null);
                return;
            }

            filter.id = this.lastID;

            callback(null, filter);
        }
    );
};
