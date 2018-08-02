--
-- Fixture for a user and feeds available for subscription.
--
INSERT INTO users (id, username, passwordHash)
VALUES (100, 'test', 'test');

INSERT INTO feeds (id, url)
VALUES (200, 'http://example.com/feed.rss'),
       (201, 'http://example.com/feed2.rss'),
       (202, 'http://example.com/feed3.rss');

INSERT INTO userFeeds (userId, feedId)
VALUES (100, 200);

INSERT INTO versions (schemaVersion) VALUES (2);
