-- Dropping this trigger prevents newly inserted rows from being instantly deleted.
-- Otherwise, the dates used by this fixture would need to be continually updated.
DROP TRIGGER IF EXISTS fetchStats_cleanup;

INSERT INTO users (id, username, passwordHash)
VALUES (100, 'test', 'test');

INSERT INTO feeds (id, url)
VALUES (200, 'http://example.com/feed.rss'),
       (201, 'http://example.com/feed2.rss'),
       (202, 'http://example.com/feed3.rss');

INSERT INTO userFeeds (userId, feedId)
VALUES (100, 200),
       (100, 201),
       (100, 202);

INSERT INTO fetchStats (created, feedId, httpStatus)
VALUES ('2018-08-01 00:00:00', 200, 200),
       ('2018-08-01 01:00:00', 200, 404),
       ('2018-08-01 02:00:00', 200, 500),
       ('2018-08-01 03:00:00', 200, 410);

INSERT INTO fetchStats (created, feedId, httpStatus)
VALUES ('2018-08-01 06:00:00', 201, 200),
       ('2018-08-01 07:00:00', 201, 200),
       ('2018-08-01 08:00:00', 201, 200),
       ('2018-08-01 09:00:00', 201, 200);

INSERT INTO versions (schemaVersion) VALUES (2);
