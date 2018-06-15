'use strict';

/**
 * Set or update feed metadata.
 *
 * Feed metadata consists of things like the feed's description, title, URL,
 * and whatever else is included in the schema of the feed table.
 */
module.exports = function (feedId, meta, callback) {
    const self = this;

    let updateCounter = 0;

    function afterUpdate(err) {
        if (err) {
            self.emit('log:error', `Failed to update feed ${feedId} metadata: ${err.message}`);
        }
        updateCounter += this.changes;
    };

    self.db.serialize(() => {
        self.db.run('BEGIN TRANSACTION');

        if (meta.title) {
            self.db.run(
                'UPDATE feeds SET title=? WHERE id=?',
                [meta.title, feedId],
                afterUpdate
            );
        }

        if (meta.description) {
            self.db.run(
                'UPDATE feeds SET description=? WHERE id=?',
                [meta.description, feedId],
                afterUpdate
            );
        }

        if (meta.siteUrl) {
            self.db.run(
                'UPDATE feeds SET siteUrl=? WHERE id=?',
                [meta.siteUrl, feedId],
                afterUpdate
            );
        }

        if (meta.url) {
            self.db.run(
                'UPDATE feeds SET url=? WHERE id=?',
                [meta.url, feedId],
                afterUpdate
            );
        }

        if (meta.updated) {
            self.db.run(
                'UPDATE feeds SET updated=? WHERE id=?',
                [meta.updated, feedId],
                afterUpdate
            );
        }

        self.db.run('COMMIT', [], (err) => {
            if (err) {
                self.emit('log:error', `Failed to commit feed ${feedId} metadata updates: ${err.message}`);
            }

            if (callback) {
                callback(updateCounter);
            }

            self.emit('feed:update:done', feedId);
        });
    });
};
