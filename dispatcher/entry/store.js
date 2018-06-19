'use strict';

const entities = require('entities');
const normalize = require('../../util/normalize');

module.exports = function (entry) {
    const self = this;

    if (!entry.url) {
        self.emit('log:warn', `Cannot store entry from ${entry.feedUrl} because it has no url`);
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

    const parsedDate =  Date.parse(entry.created);
    if (isNaN(parsedDate)) {
        entry.created = new Date();
    }

    function done(value) {
        self.emit('entry:store:done', value);
    }

    function afterStore(err) {

        if (err) {
            self.emit('log:error', `Failed to insert entry: ${err.message}`);
            done(null);
            return;
        }

        entry.changes = this.changes;

        if (this.lastID) {
            entry.id = this.lastID;
            self.emit('entry:assign', this.lastID, entry.feedId);
            self.emit('discussion:store', this.lastID, entry.discussion);
        }

        done(entry);
    }

    self.db.get('SELECT id, title FROM entries WHERE url=?', [entry.url], function (err, row) {
        if (err) {
            self.emit('log:error', `Failed to select from entries table: ${err.message}`);
            done(null);
            return;
        }

        if (row) {
            if (row.title !== entry.title) {
                self.db.run('UPDATE entries SET title=? WHERE id=?', [entry.title, row.id], function (err) {
                    if (err) {
                        self.emit('log:error', `Failed to update title for entry ${row.id}`);
                        done(null);
                        return;
                    }
                    self.emit('log:debug', `Updated title for ${entry.url}`);
                    entry.title = row.title;
                    done(entry);
                });
                return;
            }
            done(entry);
            return;
        }

        self.db.run(
            'INSERT INTO entries (feedId, fetchid, url, author, guid, title, created, body, extras) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
                entry.feedId,
                entry.fetchId,
                entry.url,
                entry.author,
                entry.guid,
                entry.title,
                entry.created,
                entry.body,
                entry.extras
            ],
            afterStore
        );
    });
};
