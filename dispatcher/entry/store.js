var entities = require('entities');
var normalize = require('../../util/normalize');
var hash = require('../../util/hash');
var keymap = require('../../util/keymap');
/**
 * Store an entry after it has been processed
 * --------------------------------------------------------------------
 */

module.exports = function (feedId, entry, subscribers) {
    var callbacks, normalizedUrl, entryId, entryKey;
    callbacks = {};
    
    // The url is probably not entity encoded, but decode anyway just
    // to be sure. Entities were observed for a time in the HN feed,
    // which made for unclickable links
    // (https:&#x2F;&#x2F;news.ycombinator.com...)
    entry.url = entities.decodeXML(entry.url);

    // Encoded entities might also appear in the title
    entry.title = entities.decodeXML(entry.title);

    normalizedUrl = normalize.url(entry.url);
    entryId = hash(normalizedUrl);

    entryKey = keymap.entryKey(entryId);


    callbacks.hget = function (added) {
        var isNew;
        isNew = false;

        if (!added) {
            // The entry is new
            entry.added = new Date().getTime();
            isNew = true;
        } else {
            entry.added = added;
            isNew = false;
        }

        this.insist('redis', 'hmset', [entryKey, entry], callbacks.hmset.bind(this, isNew, entry));
    };

    callbacks.hmset = function (isNew, entry) {
        var batch = [];

        if (isNew) {
            // Associate the entry with a feed
            batch.push(['zadd', keymap.feedEntriesKey(feedId), entry.added, entryId]);
            
            // Mark the entry as unread
            subscribers.forEach(function (subscriber) {
                batch.push(['lpush', keymap.unreadKey(subscriber), entryId]);
            });

            // Get the feed's updated date
            batch.push(['hget', keymap.feedKey(feedId), 'updated']);
        }

        this.insist('redis', 'multi', batch, callbacks.afterBatch.bind(this));
    };

    callbacks.afterBatch = function (updated) {
        updated = parseInt(updated, 10) || 0;

        if (entry.added > updated) {
            this.insist('redis', 'hset', ['updated', entry.added]);
            this.insist('log:trace', {feedId: feedId, entry: entryId}, 'updated entry');
        } else {
            this.insist('log:trace', {feedId: feedId, entry: entryId}, 'saved entry');
        }
    };
    
    this.insist('redis', 'hget', [entryKey, entry.added], callbacks.hget.bind(this));
};
