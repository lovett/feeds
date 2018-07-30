'use strict';

/**
 * Set or update feed metadata.
 *
 * Feed metadata consists of things like the feed's description, title, URL,
 * and whatever else is included in the schema of the feed table.
 */
module.exports = function (feedId, meta, callback = () => {}) {
    const self = this;

    let updateCounter = 0;

    function afterUpdate(err) {
        if (err) {
            self.emit('log:error', `Failed to update feed ${feedId} metadata: ${err.message}`);
            return;
        }

        if (this.changes) {
            updateCounter += this.changes;
        }
    }

    self.db.serialize(() => {
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
            self.db.get('SELECT id FROM feeds WHERE url=?', [meta.url], (err, row) => {
                if (err) {
                    self.emit('log:error', `Failed to select feed by url: ${err.message}`);
                    callback(err, feedId, updateCounter);
                    return;
                }

                if (!row) {
                    self.db.run(
                        'UPDATE feeds SET url=? WHERE id=?',
                        [meta.url, feedId],
                        afterUpdate
                    );
                    callback(null, feedId, updateCounter);
                } else {
                    self.db.run(
                        'UPDATE entries SET feedId=? WHERE feedId=?',
                        [row.id, feedId],
                        afterUpdate
                    );

                    self.db.run(
                        'UPDATE userEntries SET feedId=? WHERE feedId=?',
                        [row.id, feedId],
                        afterUpdate
                    );

                    self.db.run(
                        'UPDATE userFeeds SET feedId=? WHERE feedId=?',
                        [row.id, feedId],
                        afterUpdate
                    );

                    self.db.run(
                        'DELETE FROM feeds WHERE id=?',
                        [feedId],
                        afterUpdate
                    );
                    callback(null, feedId, updateCounter);
                }
            });
            return;
        }

        callback(null, feedId, updateCounter);
    });
};
