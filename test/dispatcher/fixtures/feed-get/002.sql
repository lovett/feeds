-- Fixture for a set of feeds.

INSERT INTO feeds (id, url, title, description, siteUrl, updated, abandonned, nextFetch)
VALUES (200, 'http://example.com/feed.rss', 'test feed 1', 'description for test feed 1', 'http://example.com', null, null, null),
(201, 'http://example.com/feed2.rss', 'test feed 2', 'description for test feed 2', 'http://example.com', null, null, null);
