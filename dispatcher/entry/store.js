var entities, normalize;

entities = require('entities');
normalize = require('../../util/normalize');

/**
 * Store an entry after it has been processed
 * --------------------------------------------------------------------
 */
module.exports = function (db, feedId, entry) {
    'use strict';

    var entryId, self;

    self = this;

    if (!entry.url) {
        self.emit('log:warn', 'Rejecting entry with no url', {
            feed: feedId,
            feedEntry: entry
        });
        return;
    }

    entry.title = entities.decodeXML(entry.title);

    // Probably not necessary, but just in case
    entry.url = entities.decodeXML(entry.url);

    entry.url = normalize.url(entry.url);

    function entrySaved() {
        if (this.lastID) {
            entryId = this.lastID;
        }

        if (entry.hasOwnProperty('discussion')) {
            self.emit('discussion', entryId, entry.discussion);
        }

        self.emit('entry:store:done', this.changes, entryId);
    }

    db.get('SELECT id FROM entries WHERE url=?', [entry.url], function (err, row) {
        if (err) {
            self.emit('log:error', 'Failed to select from entries table', {error: err, url: entry.url});
        }

        if (row) {
            entryId = row.id;
            db.run('UPDATE entries SET title=? WHERE id=?', [entry.title], entrySaved);
        } else {
            db.run('INSERT INTO entries (feedId, url, title, createdUtc) VALUES (?, ?, ?, datetime(?, "unixepoch"))',
                   [feedId, entry.url, entry.title, entry.createdUtc], entrySaved);
        }
    });


};
