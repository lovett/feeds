module.exports = function (db, discussion) {
    'use strict';

    var self = this;

    function discussionSaved () {
        if (!discussion.id) {
            discussion.id = this.lastID;
        }

        discussion.changes = this.changes;

        self.emit('discussion:store:done', discussion);
    }

    db.get('SELECT id FROM discussions WHERE url=?', [discussion.url], function (err, row) {
        if (err) {
            self.emit('log:error', 'Failed to select from discussions table', {error: err, url: discussion.url});
            return;
        }

        if (row) {
            discussion.id = row.id;
            db.run('UPDATE discussions SET tally=? WHERE id=?', [discussion.tally, discussion.id], discussionSaved);
        } else {
            db.run('INSERT INTO discussions (entryId, tally, label, url) VALUES (?, ?, ?, ?)',
                   [discussion.entryId, discussion.tally, discussion.label, discussion.url], discussionSaved);
        }
    });
};
