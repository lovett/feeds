/** @module feed/update */
'use strict';

/**
 * Callback for the feed-update event.
 *
 * @callback feedUpdateCallback
 * @param {error} [err] - Database error.
 *
 */

/**
 * Set or update feed metadata.
 *
 * Feed metadata consists of things like the feed's description, title, URL,
 * and whatever else is included in the schema of the feed table.
 *
 * If updating a feed's URL causes duplication (the new URL is already
 * in the database), the update will be ignored.
 *
 * @param {Number} feedId - The unique identifier of a feed.
 * @param {Object} meta - An object of key-value pairs corresponding to the schema of the feeds table.
 * @param {feedUpdateCallback} callback - A function to invoke on success or failure.
 * @event feed-update
 *
 */
module.exports = function (feedId, meta, callback) {
    const self = this;

    self.db.serialize(() => {
        self.db.run('BEGIN');

        if (meta.title) {
            self.db.run(
                'UPDATE feeds SET title=? WHERE id=?',
                [meta.title, feedId]
            );
        }

        if (meta.description) {
            self.db.run(
                'UPDATE feeds SET description=? WHERE id=?',
                [meta.description, feedId]
            );
        }

        if (meta.siteUrl) {
            self.db.run(
                'UPDATE feeds SET siteUrl=? WHERE id=?',
                [meta.siteUrl, feedId]
            );
        }

        if (meta.url) {
            self.db.run(
                'UPDATE OR IGNORE feeds SET url=? WHERE id=?',
                [meta.url, feedId]
            );
        }

        self.db.run('COMMIT', (err) => {
            callback(err);
        });
    });
};
