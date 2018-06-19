'use strict';

module.exports = function (userId, filter, callback) {

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

                    self.emit('filter:store:done', undefined);

                    if (callback) {
                        callback(undefined);
                    }

                    return;
                }

                self.emit('filter:store:done', filter);

                if (callback) {
                    callback(filter);
                }
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

                self.emit('filter:store:done', undefined);

                if (callback) {
                    callback(undefined);
                }

                return;
            }

            filter.id = this.lastID;

            self.emit('filter:store:done', filter);

            if (callback) {
                callback(filter);
            }
        }
    );
};
