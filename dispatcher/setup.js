module.exports = function (db) {
    var self = this;

    db.on('trace', function (query) {
        self.emit('log:trace', [{'query':query}, 'sql query']);
    });
    
    db.serialize(function () {
        db.run('PRAGMA foreign_keys=1');
        db.run('CREATE TABLE IF NOT EXISTS feeds (id INTEGER PRIMARY KEY, url TEXT NOT NULL, siteUrl TEXT, nextFetchUtc DEFAULT CURRENT_TIMESTAMP)');
        db.run('CREATE UNIQUE INDEX IF NOT EXISTS feed_url ON feeds (url)');

        db.run('CREATE TABLE IF NOT EXISTS entries (id INTEGER PRIMARY KEY, feedId INTEGER NOT NULL, url TEXT NOT NULL, title TEXT NOT NULL, createdUtc DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(feedId) REFERENCES feeds(id))');
        db.run('CREATE UNIQUE INDEX IF NOT EXISTS entry_url ON entries (url)');

        db.run('CREATE TABLE IF NOT EXISTS discussions (id INTEGER PRIMARY KEY, entryId INTEGER, tally INTEGER DEFAULT 0, name TEXT, url TEXT, FOREIGN KEY (entryId) REFERENCES entries(id))');

        self.emit('setup:done');
    });
};
