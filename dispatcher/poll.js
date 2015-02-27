var keymap = require('../util/keymap');

// Number of feeds to process per run
var batchSize = 1;

module.exports = function () {
    var callbacks, now;
    now = new Date().getTime();
    callbacks = {};

    callbacks.feeds = function (feedIds) {
        if (feedIds.length === 0) {
            return;
        }

        feedIds.forEach(function (feedId) {
            this.insist('log:trace', {feedId: feedId}, 'pickup');

            this.insist('redis', 'hmget', [keymap.feedKey(feedId), 'url', 'nextCheck', 'prevCheck'], callbacks.oneFeed.bind(this, feedId));
        }, this);
    };

    callbacks.oneFeed = function (feedId, result) {
        var url = result.shift();

        // Sanity check: url should exist
        if (!url) {
            this.insist('log:warn', {feedId: feedId}, 'url missing');
            this.insist('redis', 'zrem', [keymap.feedQueueKey, feedId]);
            return;
        }

        this.insist('redis', 'smembers', keymap.feedSubscribersKey(feedId), callbacks.members.bind(this, feedId, url));

    };

    callbacks.members = function (feedId, url, subscribers) {
        if (subscribers.length < 1) {
            this.insist('log:trace', {feedId: feedId, url: url}, 'dequeued - no subscribers');
            this.insist('redis', 'zrem', [keymap.feedQueueKey, feedId]);
        } else {
            this.insist('fetch', feedId, url, subscribers);
        }
    };
    
    this.insist('redis', 'zrangebyscore', [keymap.feedQueueKey, '-inf', now, 'LIMIT', 0, batchSize], callbacks.feeds.bind(this));
};
