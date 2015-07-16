var entities = require('entities');
var normalize = require('../../util/normalize');

/**
 * Store an entry after it has been processed
 * --------------------------------------------------------------------
 */

module.exports = function (db, feedId, entry) {
    var self = this;

    if (!entry.url) {
        self.emit('log:warn', 'rejecting entry with no url', {
            'feedId': feedId,
            'entry': entry
        });
        return;
    }

    entry.title = entities.decodeXML(entry.title);

    // Probably not necessary, but just in case
    entry.url = entities.decodeXML(entry.url);

    var normalizedUrl = normalize.url(entry.url);

    var callback = function () {
        self.emit('entry:store:done', this.changes, this.lastID);
    };
        
    db.run('INSERT OR IGNORE INTO entries (feedId, url, title, createdUtc) VALUES (?, ?, ?, datetime(?, "unixepoch"))',
           [feedId, normalizedUrl, entry.title, entry.createdUtc], callback);

};
