--
-- Fixture for a user, feed, entries, and filters.
--
INSERT INTO users (id, username, passwordHash)
VALUES (100, 'test', 'test');

INSERT INTO feeds (id, url)
VALUES (200, 'http://example.com/feed.rss'),
       (201, 'http://example.com/feed2.rss');

INSERT INTO userFeeds (userId, feedId)
VALUES (100, 200);

INSERT INTO filters (id, userId, feedId, value, weight)
VALUES (400, 100, 200, 'title contains dog', 1),
       (401, 100, 200, 'invalid contains dog', 1),
       (402, 100, 200, 'title invalid dog', 1),
       (403, 100, 200, 'title matches yellow', 1),
       (404, 100, 200, 'title == hello', 1),
       (405, 100, 200, 'comments > 100', 1),
       (406, 100, 200, 'comments < 50', 1);



INSERT INTO versions (schemaVersion) VALUES (2);
