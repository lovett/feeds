module.exports = function (db, args) {
    'use strict';

    var self = this;

    db.run('INSERT INTO history (type, feedId, fetchid, status, items) VALUES (?, ?, ?, ?, ?)', [args.type, args.id, args.fetchId, args.status, args.itemCount], function (err) {
        var changes, lastID;

        if (err) {
            self.emit('log:error', 'Failed to insert into history table', {error: err});
        } else {
            changes = this.changes;
            lastID = this.lastID;
        }

        self.emit('history:add:done', {
            'changes': changes,
            'id': lastID,
            'error': err
        });
    });
};
