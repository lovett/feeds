module.exports = function (db, type, feedId, fetchId, status, itemCount) {
    'use strict';

    var self = this;

    db.run('INSERT INTO history (type, feedId, fetchid, status, items) VALUES (?, ?, ?, ?, ?)', [type, feedId, fetchId, status, itemCount], function (err) {
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
