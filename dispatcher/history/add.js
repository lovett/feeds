module.exports = function (db, type, feedId, status, itemCount) {
    'use strict';

    var self = this;

    db.run('INSERT INTO history (type, feedId, status, items) VALUES (?, ?, ?, ?)', [type, feedId, status, itemCount], function (err) {
        var changes, lastId;

        if (err) {
            self.emit('log:error', 'Failed to insert into history table', {error: err});
        } else {
            changes = this.changes;
            lastId = this.lastID;
        }

        self.emit('history:add:done', changes, lastId, err);
    });
};
