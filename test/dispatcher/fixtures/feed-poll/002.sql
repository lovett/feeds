--
-- Fixture for several feeds.
--
INSERT INTO users (id, username, passwordHash)
VALUES (100, 'test', 'test');

INSERT INTO feeds (id, url, title, nextFetch, abandonned)
VALUES (200, "http://example.com/feed.rss", "test feed", CURRENT_TIMESTAMP, null),
       (201, "http://example.com/feed2.rss", "test feed 2", "2018-08-01 00:00:02", null),
       (202, "http://example.com/feed3.rss", "test feed 3", "2018-08-01 00:00:03", null);

INSERT INTO userFeeds (userId, feedId, title)
VALUES (100, 200, null);

INSERT INTO versions (schemaVersion) VALUES (2);
