'use strict';

const normalize = require('../../util/normalize');
const url = require('url');

module.exports = function (entryId, discussion, callback) {
    const self = this;

    if (!discussion.label) {
        const parsedUrl = url.parse(discussion.url);
        discussion.label = parsedUrl.hostname;
    }

    const afterSave = function (err) {
        if (err) {
            self.emit('log:error', `Failed to save discussion: ${err.message}`);
            callback(err);
            return;
        }

        discussion.id = this.lastID;

        discussion.changes = this.changes;

        callback(null, discussion);
    };

    self.db.get(
        'SELECT id FROM discussions WHERE entryId=? AND label=?',
        [entryId, discussion.label],
        (err, row) => {
            if (err) {
                self.emit('log:error', `Failed to select discussion for entry ${discussion.entryId}: ${err.message}`);
                callback(err);
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
