var Firebase = require('firebase');
var hnFirebase;

/**
 * Fetch Hacker News stories via Firebase API
 * --------------------------------------------------------------------
 */
module.exports = function (feedId, feedurl, subscribers) {
    var callbacks, topStories, keyMaker, storyIds;
    
    if (hnFirebase) {
        // the Firebase client is already connected
        this.insist('schedule', feedId);
        return;
    }

    hnFirebase = new Firebase('https://hacker-news.firebaseio.com/v0');

    topStories = hnFirebase.child('/topstories').limitToFirst(30);

    keyMaker = function (id) {
        return 'hnid:' + id;
    };

    callbacks.onValue = function (snapshot) {
        var redisKeys, keyMaker;

        // convert snapshot to an array of story ids
        storyIds = snapshot.val();

        // map story ids to redis keys
        redisKeys = storyIds.map(function (id) {
            return keyMaker(id);
        });

        this.insist('redis', 'mget', redisKeys, callbacks.getKeys.bind(this));
    };

    callbacks.getKeys = function (err, res) {
        if (err) {
            this.insist('log:error', err);
            return;
        }
        res.forEach(callbacks.eachItem.bind(this));
    };

    callbacks.eachItem = function (storyId, index) {
        var redisKey;
        if (storyId !== null) {  // the story has recently been fetched; ignore it
            return;
        }
            
        storyId = storyIds[index];
        redisKey = keyMaker(storyId);

        this.insist('redis', 'set', [storyId, 'EX', 600], callbacks.onSave.bind(this, storyId));
    };

    callbacks.onSave = function (storyId, response) {
        if (response === 'OK') {
            hnFirebase.child('/item/' + storyId).once('value', callbacks.processEntry.bind(this));
        } else {
            this.insist('log:error', response);
        }
    };

    callbacks.processEntry = function (snapshot) {
        var story = snapshot.val();

        // val() could have returned a null, indicating the snapshot was empty
        if (!(story instanceof Object)) {
            return;
        }

        if (!(story.kids instanceof Array)) {
            story.kids = [];
        }

        if (!('dead' in story)) {
            story.dead = false;
        }

        var entry = {
            title: story.title,
            date: story.time,
            url: story.url,
            hnLink: 'https://news.ycombinator.com/item?id=' + story.id,
            hnComments: story.kids.length,
            score: story.score,
            dead: story.dead || false,
            type: story.type
        };

        this.insist('storeEntry', feedId, entry, subscribers);
    };

    topStories.on('value', callbacks.onValue.bind(this));

    this.insist('schedule', feedId);
};
