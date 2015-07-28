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

    // Probably not necessary, but just in case
    entry.url = entities.decodeXML(entry.url);

    entry.normalizedUrl = normalize.url(entry.url);

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

        if (entry.hasOwnProperty('discussion')) {
            entry.discussion.entryId = entry.id;

            self.emit('discussion', entry.discussion);
        }

        self.emit('entry:store:done', entry);
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
            db.run('INSERT INTO entries (feedId, fetchid, url, normalizedUrl, title, createdUtcSeconds) VALUES (?, ?, ?, ?, ?, ?)',
                   [entry.feedId, entry.fetchId, entry.url, entry.normalizedUrl, entry.title, entry.createdUtcSeconds], entrySaved);
        }
    });


};
