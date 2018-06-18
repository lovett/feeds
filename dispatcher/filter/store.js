'use strict';

module.exports = function (userId, filter) {

    const self = this;

    if (filter.id) {
        db.run(
            'UPDATE filters SET value=?, weight=?, feedId=? WHERE id=?',
            [filter.value, filter.weight, filter.feedId, filter.id],
            (err) => {
                if (err) {
                    self.emit(
                        'log:error',
                        `Failed to update filter: ${err.message}`
                    );
                }
                self.emit('filter:store:done', filter);
            }
        );

        return;
    }

    db.run(
        'INSERT INTO filters (userId, feedId, value, weight) VALUES (?, ?, ?, ?)',
        [userId, filter.feedId, filter.value, filter.weight],
        (err) => {
            if (err) {
                self.emit(
                    'log:error',
                    `Failed to insert filter: ${err.message}`
                );
            }
            self.emit('filter:store:done', filter);
        }
    );
};
