var redis = require('redis');
var bunyan = require('bunyan');
var fs = require('fs');

/**
 * Environment variables
 * --------------------------------------------------------------------
 *
 * If the file env.json exists, declare its contents as environtment
 * variables.
 */
var env;
try {
    env = fs.readFileSync('env.json', {encoding: 'utf8'});
    env = JSON.parse(env);

    Object.keys(env).forEach(function (key) {
        process.env[key] = env[key];
    });
} catch (e) {
}

env = {};

module.exports = {
    events: require('events'),
    client: redis.createClient(),
    redisClient: redis.createClient(),
    redisPubsubClient: redis.createClient(),
    request: require('request'),
    url: require('url'),
    util: require('util'),
    htmlparser: require('htmlparser'),
    console: console,
    moment: require('moment'),
    cityhash: require('cityhash'),
    logger: bunyan.createLogger({
        name: 'headlines',
        serializers: {
            redis: function (err) {
                var firstMessage = err.shift().message.replace('Error: ', '');
                console.error(firstMessage);
                return firstMessage
            }
        },
        streams: [
            {
                path: process.env.HEADLINES_LOG,
                level: process.env.HEADLINES_LOG_LEVEL
            }
        ]
    }),
    fs: fs,
    mkdirp: require('mkdirp'),
    path: require('path'),
    archivePath: function (hash) {
        return "archive/" + hash.substr(0, 1) + "/" + hash.substr(0, 2) + "/" + hash;
    },
    hash: function (key) {
        return this.cityhash.hash64(key).value;
    },
    minToMs: function (min) {
        return min * 60 * 1000;
    },
    feedCheckInterval: Math.max(10, process.env.HEADLINES_FEED_CHECK_INTERVAL_MINUTES) * 60 * 1000,
    keys: {
        // A sorted set of how many users are subscribed to each feed
        // The set memeber is a feed id. The score is the number of
        // subscribers.
        feedSubscriptionsKey: "feeds:subscriptions",

        // If a userId is specified, a hash of user-specific feed
        // metadata (such as the feed name). If not, a hash of
        // user-agnostic feed metadata (such as its url).
        feedKey: function (feedId, userId) {
            var value = 'feed:' + feedId;
            if (userId) {
                value += ':user:' + userId;
            }
            return value;
        },

        // A set of user ids that are subscribed to a feed
        feedSubscribersKey: function (feedId) {
            return 'feed:' + feedId + ':users';
        },

        // A set of feed ids that a user is subscribed to
        feedListKey: function(userId) {
            return "user:" + userId + ':feeds';
        },

        // A sorted set of next-check timestamps for each subscribed
        // feed. The set memeber is a feed id. The score is a unix
        // timestamp indicating when the feed should next be fetched.
        feedQueueKey: 'feeds:queue',

        // A hash of entry metadata. The entry id is a hash derived
        // from its url.
        entryKey: function (entryId) {
            return 'entry:' + entryId;
        },

        // A sorted set associating feeds to entries.  The set member
        // is a feed id. The score is a timestamp indicating when the
        // entry was added. The set member is a feed id.
        feedEntriesKey: function (feedId) {
            return 'feed:' + feedId + ':entries';
        },

        // A set of feed ids that have not yet been read by a user.
        unreadKey: function (userId) {
            return 'user:' + userId + ':unread';
        },

        // A set of feed ids that a user has saved
        savedKey: function (userId) {
            return 'user:' + userId + ':saved';
        }
    }
};
