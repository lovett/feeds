'use strict';

const entities = require('entities');
const normalize = require('../../util/normalize');

module.exports = function (entry) {
    const self = this;

    if (!entry.url) {
        self.emit('log:warn', `Cannot store entry from ${entry.feedUrl} because it has no url`);
        return;
    }

    entry.title = entities.decodeXML(entry.title);

    entry.url = entities.decodeXML(entry.url);

    entry.normalizedUrl = normalize.url(entry.url);

    if (entry.author) {
        entry.author = entities.decodeXML(entry.author);
    }

    if (entry.extras) {
        entry.extras = JSON.stringify(entry.extras);
    }

    function afterStore(err) {

        if (err) {
            self.emit('log:error', `Failed to insert entry: ${err.message}`);
            return;
        }

        if (this.lastID) {
            entry.id = this.lastID;
        }

        entry.changes = this.changes;
        entry.userIds = [];

        if (entry.discussion.url) {
            entry.discussion.entryId = entry.id;
            self.emit('discussion:store', entry.discussion);
        }

        self.emit('entry:assign', entry.id, entry.feedId);
        self.emit('entry:store:done', entry);
    }

    self.db.get('SELECT id, title FROM entries WHERE url=?', [entry.url], function (err, row) {
        if (err) {
            self.emit('log:error', `Failed to select from entries table: ${err.message}`);
            return;
        }

        if (row) {
            if (row.title !== entry.title) {
                self.db.run('UPDATE entries SET title=? WHERE id=?', [entry.title, row.id], function (err) {
                    if (err) {
                        self.emit('log:error', `Failed to update title for entry ${row.id}`);
                        return;
                    }
                    self.emit('log:debug', `Updated title for ${entry.url}`);
                });
            }
            return;
        }

        self.db.run(
            'INSERT INTO entries (feedId, fetchid, url, author, normalizedUrl, title, created, body, extras) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
                entry.feedId,
                entry.fetchId,
                entry.url,
                entry.author,
                entry.normalizedUrl,
                entry.title,
                entry.created,
                entry.body,
                entry.extras
            ],
            afterStore
        );
    });
};
