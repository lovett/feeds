'use strict';

const sqlite3 = require('sqlite3');

/**
 * Connect to an SQLite database and declare a schema.
 *
 * The dispatcher uses a single shared database connection.
 *
 * The schema is declared as a single string for the sake of
 * readability both here and in SQLite.
 */
module.exports = function (database) {
    const self = this;

    if (database instanceof sqlite3.Database) {
        self.db = database;
    } else {
        self.db = new sqlite3.Database(database);
    }

    const schema = `
PRAGMA foreign_keys=1;

CREATE TABLE IF NOT EXISTS feeds
(
  id INTEGER PRIMARY KEY,
  url TEXT NOT NULL,
  title TEXT DEFAULT NULL,
  description TEXT DEFAULT NULL,
  siteUrl TEXT DEFAULT NULL,
  created DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated DATETIME DEFAULT NULL,
  nextFetch DATETIME DEFAULT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS feed_url_unique
ON feeds (url);

CREATE TABLE IF NOT EXISTS entries
(
  id INTEGER PRIMARY KEY,
  feedId INTEGER NOT NULL,
  fetchid TEXT,
  url TEXT NOT NULL,
  guid TEXT NOT NULL,
  title TEXT NOT NULL,
  author TEXT DEFAULT NULL,
  created DATETIME DEFAULT CURRENT_TIMESTAMP,
  body TEXT DEFAULT NULL,
  extras TEXT DEFAULT NULL,
  FOREIGN KEY(feedId) REFERENCES feeds(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS entry_guid_unique
ON entries (guid);

CREATE TABLE IF NOT EXISTS discussions
(
  id INTEGER PRIMARY KEY,
  entryId INTEGER NOT NULL,
  label TEXT NOT NULL,
  url TEXT DEFAULT NULL,
  commentCount INTEGER DEFAULT NULL,
  FOREIGN KEY (entryId) REFERENCES entries(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS discussion_unique
ON discussions (entryId, label);

CREATE INDEX IF NOT EXISTS discussion_label
ON discussions (label);

CREATE INDEX IF NOT EXISTS discussion_entry
ON discussions (entryId);

CREATE TABLE IF NOT EXISTS users
(
  id INTEGER PRIMARY KEY, username TEXT NOT NULL, passwordHash TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS username_unique
ON users (username);

CREATE TABLE IF NOT EXISTS userFeeds
(
  userId INTEGER NOT NULL,
  feedId INTEGER NOT NULL,
  title TEXT DEFAULT NULL,
  FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY(feedId) REFERENCES feeds(id) ON DELETE CASCADE,
  PRIMARY KEY (userId, feedId)
);

CREATE TABLE IF NOT EXISTS userEntries (
  userId INTEGER NOT NULL,
  entryId INTEGER NOT NULL,
  read DEFAULT 0,
  saved DEFAULT 0,
  score DEFAULT 0,
  FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY(entryId) REFERENCES entries(id) ON DELETE CASCADE,
  PRIMARY KEY (userId, entryId)
);

CREATE TABLE IF NOT EXISTS fetchStats
(
  id INTEGER PRIMARY KEY,
  created DEFAULT CURRENT_TIMESTAMP,
  fetchid TEXT,
  feedId INTEGER NOT NULL,
  httpStatus INTEGER DEFAULT 0,
  FOREIGN KEY(feedId) REFERENCES feeds(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS fetchStats_fetchid
ON fetchStats(fetchid);

CREATE INDEX IF NOT EXISTS fetchStats_feedId
ON fetchStats(feedId);

CREATE TRIGGER IF NOT EXISTS fetchStats_cleanup
AFTER INSERT ON fetchStats BEGIN
DELETE FROM fetchStats WHERE created < datetime('now', '-90 day', 'utc');
END;

CREATE TABLE IF NOT EXISTS filters (
  id INTEGER PRIMARY KEY,
  userId INTEGER NOT NULL,
  feedId INTEGER DEFAULT NULL,
  value TEXT,
  weight INTEGER DEFAULT 0,
  FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY(feedId) REFERENCES feeds(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS userEntryFilters
(
  userId INTEGER NOT NULL,
  entryId INTEGER NOT NULL,
  filterId INTEGER NOT NULL,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (entryId) REFERENCES entries(id) ON DELETE CASCADE,
  FOREIGN KEY (filterId) REFERENCES filters(id) ON DELETE CASCADE,
  PRIMARY KEY (userId, entryId, filterId)
);

INSERT OR IGNORE INTO users (username, passwordHash) VALUES ('headlines', 'headlines');

CREATE VIEW IF NOT EXISTS nextFeedToFetchView AS
SELECT feeds.id, feeds.url
FROM userFeeds JOIN feeds ON userFeeds.feedId=feeds.rowid
WHERE feeds.nextFetch < CURRENT_TIMESTAMP OR feeds.nextFetch IS NULL
ORDER BY feeds.nextFetch
LIMIT 1
`;

    self.db.serialize(() => {
        self.db.run('BEGIN TRANSACTION');

        const queries = schema.split(';\n\n');
        queries.forEach((query) => {
            if (query.trim()) {
                self.db.run(query, (err) => {
                    if (err) {
                        self.emit('log:error', err.message);
                    }
                });
            }
        });

        self.db.run('COMMIT', [], (err) => {
            if (err) {
                self.emit('log:error', err.message);
            }

            self.emit('startup:done');
        });
    });
};
