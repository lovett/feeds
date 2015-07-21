module.exports = function (db, entryId, discussion) {
    'use strict';

    var discussionID, self;

    self = this;

    function discussionSaved () {
        if (!discussionID) {
            discussionID = this.lastID;
        }

        self.emit('discussion:store:done', this.changes, discussionID);
    }

    db.get('SELECT id FROM discussions WHERE url=?', [discussion.url], function (err, row) {
        if (err) {
            self.emit('log:error', 'Failed to select from discussions table', {err: err, url: discussion.url});
        }

        if (row) {
            discussionID = row.id;
            db.run('UPDATE discussions SET tally=? WHERE id=?', [discussion.tally, discussionID], discussionSaved);
        } else {
            db.run('INSERT INTO discussions (entryId, tally, label, url) VALUES (?, ?, ?, ?)',
                   [entryId, discussion.tally, discussion.label, discussion.url], discussionSaved);
        }
    });
};
