var entities, normalize;

entities = require('entities');
normalize = require('../../util/normalize');

/**
 * Store an entry after it has been processed
 * --------------------------------------------------------------------
 */
module.exports = function (db, entry) {
    'use strict';

    var self = this;

    if (!entry.url) {
        self.emit('log:warn', 'Rejecting entry with no url', entry);
        return;
    }

    entry.title = entities.decodeXML(entry.title);

    entry.url = entities.decodeXML(entry.url);

    entry.normalizedUrl = normalize.url(entry.url);

    if (!entry.author) {
        entry.author = undefined;
    } else {
        entry.author = entities.decodeXML(entry.author);
    }

    if (entry.extras) {
        entry.extras = JSON.stringify(entry.extras);
    }

    if (!entry.hasOwnProperty('createdUtcSeconds')) {
        if (entry.hasOwnProperty('created')) {
            entry.createdUtcSeconds = new Date(entry.created).getTime() / 1000;

            if (Number.isNaN(entry.createdUtcSeconds)) {
                entry.createdUtcSeconds = undefined;
            }
        }

        if (!entry.createdUtcSeconds) {
            entry.createdUtcSeconds = new Date().getTime() / 1000;
        }
    }

    function entrySaved() {
        if (this.lastID) {
            entry.id = this.lastID;
        }

        entry.changes = this.changes;
        entry.userIds = [];

        if (entry.hasOwnProperty('discussion')) {
            entry.discussion.entryId = entry.id;

            self.emit('discussion', entry.discussion);
        }

        db.all('SELECT userId from userFeeds WHERE feedId=?', [entry.feedId], function (err, rows) {
            if (err) {
                self.emit('log:error', 'Failed to select user from userFeeds table', {error: err, entry: entry});
                self.emit('entry:store:done', entry);
                return;
            }

            entry.userIds = rows.map(function (row) {
                return row.userId;
            });

            entry.userIds.forEach(function (userId) {
                db.run('INSERT OR IGNORE INTO userEntries (userId, entryId) VALUES (?, ?)', [userId, entry.id], function (insertErr) {
                    if (insertErr) {
                        self.emit('log:error', 'Failed to insert into userEntries table', {error: insertErr, entry: entry});
                    }
                });
            });

            self.emit('entry:store:done', entry);
            self.emit('filter:apply', db, entry);
        });
    }

    db.get('SELECT id FROM entries WHERE url=?', [entry.url], function (err, row) {
        if (err) {
            self.emit('log:error', 'Failed to select from entries table', {error: err, url: entry.url});
            return;
        }

        if (row) {
            entry.id = row.id;
            db.run('UPDATE entries SET title=? WHERE id=?', [entry.title], entrySaved);
        } else {
            db.run('INSERT INTO entries (feedId, fetchid, url, author, normalizedUrl, title, createdUtcSeconds, body, extras) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                   [entry.feedId, entry.fetchId, entry.url, entry.author, entry.normalizedUrl, entry.title, entry.createdUtcSeconds, entry.body, entry.extras], entrySaved);
        }
    });


};
