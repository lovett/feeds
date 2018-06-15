'use strict';

const normalize = require('../../util/normalize');
const url = require('url');

module.exports = function (entryId, discussion) {
    const self = this;

    if (!discussion.label) {
        self.emit('log:warning', 'Ignoring discussion with no label');
        return;
    }

    function afterSave (err) {
        if (err) {
            self.emit('log:error', `Failed to save discussion: ${err.message}`);
            return;
        }

        if (this.lastID) {
            discussion.id = this.lastID;
        }

        discussion.changes = this.changes;

        self.emit('discussion:store:done', discussion);
    }

    self.db.get(
        'SELECT id FROM discussions WHERE entryId=? AND label=?',
        [entryId, discussion.label],
        function (err, row) {
            if (err) {
                self.emit('log:error', `Failed to select discussion for entry ${discussion.entryId}: ${err.message}`);
                return;
            }

            if (row && discussion.commentCount) {
                self.db.run(
                    'UPDATE discussions SET commentCount=? WHERE id=?',
                    [discussion.commentCount, row.id],
                    afterSave
                );
                return;
            }

            self.db.run(
                'INSERT INTO discussions (entryId, commentCount, label, url) VALUES (?, ?, ?, ?)',
                [
                    entryId,
                    discussion.commentCount,
                    discussion.label,
                    discussion.url
                ],
                afterSave
            );
        }
    );
};
