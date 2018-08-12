--
-- Fixture for a user, feed, and filter.
--
INSERT INTO users (id, username, passwordHash)
VALUES (100, 'test', 'test');

INSERT INTO feeds (id, url)
VALUES (200, 'http://example.com/feed.rss');

INSERT INTO userFeeds (userId, feedId)
VALUES (100, 200);

INSERT INTO filters (id, userId, feedId, value, weight)
VALUES (400, 100, 200, 'title contains word', 1);

INSERT INTO versions (schemaVersion) VALUES (2);
