CREATE TABLE IF NOT EXISTS feeds
(
  id INTEGER PRIMARY KEY,
  url TEXT NOT NULL,
  title TEXT DEFAULT NULL,
  description TEXT DEFAULT NULL,
  siteUrl TEXT DEFAULT NULL,
  created DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated DATETIME DEFAULT NULL,
  abandonned DATETIME DEFAULT NULL,
  nextFetch DATETIME DEFAULT CURRENT_TIMESTAMP
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
  feedId INTEGER NOT NULL,
  entryId INTEGER NOT NULL,
  read DEFAULT 0,
  saved DEFAULT 0,
  score DEFAULT 0,
  FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY(feedId) REFERENCES feeds(id) ON DELETE CASCADE,
  FOREIGN KEY(entryId) REFERENCES entries(id) ON DELETE CASCADE,
  PRIMARY KEY (userId, entryId)
);

CREATE INDEX IF NOT EXISTS userEntries_userId
ON userEntries (userId);

CREATE INDEX IF NOT EXISTS userEntries_feedId
ON userEntries (feedId);

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

CREATE TABLE IF NOT EXISTS versions
(
  schemaVersion INTEGER DEFAULT 1
);

INSERT OR IGNORE INTO users (username, passwordHash) VALUES ('headlines', 'headlines');

CREATE VIEW IF NOT EXISTS nextFeedToFetchView AS
SELECT feeds.id, feeds.url
FROM userFeeds JOIN feeds ON userFeeds.feedId=feeds.rowid
WHERE (feeds.nextFetch <= CURRENT_TIMESTAMP)
AND feeds.abandonned IS NULL
ORDER BY feeds.nextFetch
LIMIT 1;

CREATE VIEW IF NOT EXISTS entryWithFiltersView AS
SELECT e.id, e.fetchid, e.title, e.author, e.created, e.body, e.extras, f.value, f.weight
FROM entries e
JOIN feeds fd ON e.feedId=fd.id
JOIN filters f ON (fd.id=f.feedId OR f.feedId IS NULL);

CREATE TRIGGER IF NOT EXISTS fetchStats_cleanup
AFTER INSERT ON fetchStats BEGIN
DELETE FROM fetchStats WHERE created < datetime('now', '-90 day', 'utc');
END;

CREATE TRIGGER IF NOT EXISTS feed_updated
AFTER UPDATE OF url, title, description, siteUrl ON feeds
FOR EACH ROW
BEGIN
UPDATE feeds SET updated=datetime('now') WHERE rowid=NEW.rowid;
END;

INSERT INTO versions (schemaVersion) VALUES (1);
