// API documentation: https://github.com/HackerNews/API

module.exports = function (hnFirebase, feedId) {
    'use strict';

    var self = this;

    function onItem (snapshot) {
        var entry, item;

        item = snapshot.val();

        // val() could have returned a null, indicating the snapshot was empty
        if (!item) {
            self.emit('log:trace', 'Empty snapshot for item');
            return;
        }

        if (!item.kids) {
            item.kids = [];
        }

        entry = {
            title: item.title,
            createdUtcSeconds: item.time,
            url: item.url,
            discussion: {
                url: 'https://news.ycombinator.com/item?id=' + item.id,
                label: 'Hacker News',
                tally: item.kids.length
            },
            score: item.score,
            dead: item.dead,
            type: item.type
        };

        self.emit('entry', feedId, entry);
    }

    function onValue (snapshot) {
        var ids;

        // convert snapshot to an array of story ids
        ids = snapshot.val();

        // mockfirebase doesn't automatically convert numerically keyed objects to arrays
        if (!(ids instanceof Array)) {
            ids = Object.keys(ids).map(function (key) {
                return ids[key];
            });
        }

        ids.forEach(function (storyId) {
            hnFirebase.child('/item/' + storyId).once('value', onItem);
        });
    }


    hnFirebase.child('/topstories').limitToFirst(30).on('value', onValue);
};
