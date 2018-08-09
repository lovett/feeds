--
-- Fixture for a user subscribed to a feed with multiple unread entries.
--
INSERT INTO users (id, username, passwordHash)
VALUES (100, 'test', 'test');

INSERT INTO feeds (id, url, title)
VALUES (200, "http://example.com/feed.rss", "test feed");

INSERT INTO entries (id, feedId, url, guid, title)
VALUES (300, 200, 'http://example.com/entry.html', 'test-guid', 'test entry'),
       (301, 200, 'http://example.com/entry.html', 'test-guid2', 'test entry 2'),
       (302, 200, 'http://example.com/entry.html', 'test-guid3', 'test entry 3');


INSERT INTO userFeeds (userId, feedId, title)
VALUES (100, 200, null);

INSERT INTO userEntries (userId, feedId, entryId, read)
VALUES (100, 200, 300, 0),
       (100, 200, 301, 0),
       (100, 200, 302, 1);

INSERT INTO versions (schemaVersion) VALUES (2);
