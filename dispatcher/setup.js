module.exports = function (db) {
    'use strict';

    var self = this;

    db.on('trace', function (query) {
        self.emit('log:trace', 'Database query', {q: query});
    });

    db.serialize(function () {
        db.run('PRAGMA foreign_keys=1');
        db.run('CREATE TABLE IF NOT EXISTS feeds (id INTEGER PRIMARY KEY, url TEXT NOT NULL, siteUrl TEXT, nextFetchUtcSeconds FLOAT)');
        db.run('CREATE UNIQUE INDEX IF NOT EXISTS feed_url_unique ON feeds (url)');

        db.run('CREATE TABLE IF NOT EXISTS entries (id INTEGER PRIMARY KEY, feedId INTEGER NOT NULL, fetchid TEXT, url TEXT NOT NULL, normalizedUrl TEXT NOT NULL, title TEXT NOT NULL, author TEXT DEFAULT NULL, createdUtcSeconds FLOAT DEFAULT 0, FOREIGN KEY(feedId) REFERENCES feeds(id) ON DELETE CASCADE)');
        db.run('CREATE UNIQUE INDEX IF NOT EXISTS entry_url_unique ON entries (normalizedUrl)');

        db.run('CREATE TABLE IF NOT EXISTS discussions (id INTEGER PRIMARY KEY, entryId INTEGER NOT NULL, tally INTEGER DEFAULT 0, label TEXT NOT NULL, url TEXT NOT NULL, FOREIGN KEY (entryId) REFERENCES entries(id) ON DELETE CASCADE)');
        db.run('CREATE UNIQUE INDEX IF NOT EXISTS discussion_url ON discussions (url)');

        db.run('CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, username TEXT NOT NULL, passwordHash TEXT NOT NULL)');
        db.run('CREATE UNIQUE INDEX IF NOT EXISTS username_unique ON users (username)');

        db.run('CREATE TABLE IF NOT EXISTS userFeeds (userId INTEGER NOT NULL, feedId INTEGER NOT NULL, FOREIGN KEY(userId) REFERENCES users(id), FOREIGN KEY(feedId) REFERENCES feeds(id) ON DELETE CASCADE, PRIMARY KEY (userId, feedId))');

        db.run('CREATE TABLE IF NOT EXISTS history (id INTEGER PRIMARY KEY, created DEFAULT CURRENT_TIMESTAMP, fetchid TEXT, feedId INTEGER NOT NULL, type TEXT NOT NULL, status INTEGER DEFAULT 0, items INTEGER DEFAULT 0, FOREIGN KEY(feedId) REFERENCES feeds(id) ON DELETE CASCADE)');
        db.run('CREATE UNIQUE INDEX IF NOT EXISTS history_fetchid ON history(fetchid)');
        db.run('CREATE INDEX IF NOT EXISTS history_type ON history(type)');
        db.run('CREATE INDEX IF NOT EXISTS history_feedId ON history(feedId)');

        self.unlisten(__filename);
        self.emit('setup:done');
    });
};
