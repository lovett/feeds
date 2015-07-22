module.exports = function (db) {
    'use strict';

    var self = this;

    db.on('trace', function (query) {
        self.emit('log:trace', 'Database query', {q: query});
    });

    db.serialize(function () {
        db.run('PRAGMA foreign_keys=1');
        db.run('CREATE TABLE IF NOT EXISTS feeds (id INTEGER PRIMARY KEY, url TEXT NOT NULL, siteUrl TEXT, nextFetchUtc DEFAULT CURRENT_TIMESTAMP)');
        db.run('CREATE UNIQUE INDEX IF NOT EXISTS feed_url_unique ON feeds (url)');

        db.run('CREATE TABLE IF NOT EXISTS entries (id INTEGER PRIMARY KEY, feedId INTEGER NOT NULL, url TEXT NOT NULL, title TEXT NOT NULL, createdUtc DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(feedId) REFERENCES feeds(id))');
        db.run('CREATE UNIQUE INDEX IF NOT EXISTS entry_url_unique ON entries (url)');

        db.run('CREATE TABLE IF NOT EXISTS discussions (id INTEGER PRIMARY KEY, entryId INTEGER NOT NULL, tally INTEGER DEFAULT 0, label TEXT NOT NULL, url TEXT NOT NULL, FOREIGN KEY (entryId) REFERENCES entries(id))');
        db.run('CREATE UNIQUE INDEX IF NOT EXISTS discussion_url ON discussions (url)');

        db.run('CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, username TEXT NOT NULL, passwordHash TEXT NOT NULL)');
        db.run('CREATE UNIQUE INDEX IF NOT EXISTS username_unique ON users (username)');

        db.run('CREATE TABLE IF NOT EXISTS userFeeds (userId INTEGER NOT NULL, feedId INTEGER NOT NULL, FOREIGN KEY(userId) REFERENCES users(id), FOREIGN KEY(feedId) REFERENCES feeds(id), PRIMARY KEY (userId, feedId))');

        self.emit('setup:done');
    });
};