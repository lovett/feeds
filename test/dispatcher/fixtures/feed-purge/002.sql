--
-- Fixture for a several feeds.
--
INSERT INTO users (id, username, passwordHash)
VALUES (100, 'test', 'test');

INSERT INTO feeds (id, url)
VALUES (200, 'http://example.com/feed.rss'),
       (201, 'http://example.com/feed2.rss'),
       (202, 'http://example.com/feed3.rss'),
       (203, 'http://example.com/feed4.rss'),
       (204, 'http://example.com/feed5.rss');

INSERT INTO userFeeds (userId, feedId)
VALUES (100, 200),
       (100, 201);

INSERT INTO entries (id, feedId, url, guid, title)
VALUES (300, 201, 'http://example.com/entry.html', 'test-guid', 'test entry');

INSERT INTO userEntries (userId, feedId, entryId)
VALUES (100, 201, 300);

INSERT INTO versions (schemaVersion) VALUES (2);
