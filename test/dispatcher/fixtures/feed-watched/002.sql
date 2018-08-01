--
-- Fixture for a user subscribed to 2 feeds (one with unread entries, the other without)
-- a user subscribed to no feeds, and a user subscribed to 1 feed with a custom title.
--
INSERT INTO users (id, username, passwordHash)
VALUES (100, 'test', 'test'),
       (101, 'test1', 'test1'),
       (102, 'test2', 'test2');

INSERT INTO feeds (id, url, title)
VALUES (200, "http://example.com/feed.rss", "test feed"),
       (201, "http://example.com/feed2.rss", "test feed 2");

INSERT INTO entries (id, feedId, url, guid, title)
VALUES (300, 200, 'http://example.com/entry.html', 'test-guid', 'test entry');

INSERT INTO entries (id, feedId, url, guid, title)
VALUES (301, 200, 'http://example.com/entry.html', 'test-guid2', 'test entry 2');

INSERT INTO userFeeds (userId, feedId, title)
VALUES (100, 200, null),
       (100, 201, null),
       (102, 201, 'overridden title');

INSERT INTO userEntries (userId, feedId, entryId)
VALUES (100, 200, 300),
       (100, 200, 301);

INSERT INTO fetchStats (id, fetchid, feedId, httpStatus)
VALUES (400, 'test-fetchid', 200, 200);

INSERT INTO versions (schemaVersion) VALUES (2);
