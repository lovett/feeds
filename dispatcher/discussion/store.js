'use strict';

const normalize = require('../../util/normalize');
const url = require('url');

module.exports = function (discussion) {
    const self = this;

    if (!discussion.url) {
        self.emit('log:debug', 'Ignoring discussion with no url');
        return;
    }

    if (!discussion.label) {
        discussion.label = normalize.url(discussion.url, 'hostname');
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
        [discussion.entryId, discussion.label],
        function (err, row) {
            if (err) {
                self.emit('log:error', `Failed to select discussion for entry ${discussion.entryId}: ${err.message}`);
                return;
            }

            if (row && discussion.tally) {
                discussion.id = row.id;
                self.db.run(
                    'UPDATE discussions SET tally=? WHERE id=?',
                    [discussion.tally, discussion.id],
                    afterSave
                );
                return;
            }

            self.db.run(
                'INSERT INTO discussions (entryId, tally, label, url) VALUES (?, ?, ?, ?)',
                [
                    discussion.entryId,
                    discussion.tally,
                    discussion.label,
                    discussion.url
                ],
                afterSave
            );
        }
    );
};
