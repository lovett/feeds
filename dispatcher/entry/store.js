/** @module entry/store */
'use strict';

const entities = require('entities');
const normalize = require('../../util/normalize');

/**
 * Callback for the entry-store event.
 *
 * @callback entryStoreCallback
 * @param {error} [err] - Database error.
 * @param {Object} entry - The stored entry.
 *
 */

/**
 * Store an entry that has been parsed out of a feed.
 *
 * @param {Object} meta - An object of key-value pairs corresponding to the schema of the entries table.
 * @param {entryStoreCallback} callback - A function to invoke on success or failure.
 * @event entry-store
 *
 */
module.exports = function (entry, callback = () => {}) {
    const self = this;

    if (!entry.url) {
        const err = new Error(`Cannot store entry from ${entry.feedUrl} because it has no url`);
        self.emit('log:warn', err.message);
        callback(err);
        return;
    }

    entry.changes = 0;

    entry.title = entities.decodeXML(entry.title);

    entry.url = entities.decodeXML(entry.url);

    if (!entry.guid) {
        entry.guid = normalize.url(entry.url);
    }

    if (entry.author) {
        entry.author = entities.decodeXML(entry.author);
    }

    if (entry.extras) {
        entry.extras = JSON.stringify(entry.extras);
    }

    self.db.get('SELECT id, title FROM entries WHERE url=?', [entry.url], function (err, row) {
        if (err) {
            self.emit('log:error', `Failed to select from entries table: ${err.message}`);
            callback(err);
            return;
        }

        // New entry.
        if (!row) {
            self.db.run(
                `INSERT INTO entries (feedId, fetchid, url, author, guid, title, created, body, extras)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    entry.feedId,
                    entry.fetchId,
                    entry.url,
                    entry.author,
                    entry.guid,
                    entry.title,
                    entry.created.toISOString().slice(0, 19).replace('T', ' '),
                    entry.body,
                    entry.extras
                ],
                function (err) {
                    if (err) {
                        self.emit('log:error', `Failed to insert entry: ${err.message}`);
                        callback(err);
                        return;
                    }

                    entry.changes = this.changes;

                    entry.id = this.lastID;
                    self.emit('entry:assign', this.lastID, entry.feedId);
                    self.emit('discussion:store', this.lastID, entry.discussion);
                    callback(null, entry);
                }
            );
            return;
        }

        // Existing entry, title change.
        if (row.title !== entry.title) {
            self.db.run(
                'UPDATE entries SET title=? WHERE id=?',
                [entry.title, row.id],
                (err) => {
                    if (err) {
                        self.emit('log:error', `Failed to update title for entry ${row.id}`);
                        callback(err);
                        return;
                    }
                    callback(null, entry);
                }
            );
            return;
        }

        // Existing entry, no change.
        callback(null, entry);
    });
};
