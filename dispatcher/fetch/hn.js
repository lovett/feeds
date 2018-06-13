'use strict';

// API documentation: https://github.com/HackerNews/API

module.exports = function (hnFirebase, args) {
    const self = this;

    const fetchId = crypto.pseudoRandomBytes(10).toString('hex');

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
            feedId: args.id,
            fetchId: fetchId,
            title: item.title,
            createdUtcSeconds: item.time,
            url: item.url,
            author: item.by,
            discussion: {
                url: 'https://news.ycombinator.com/item?id=' + item.id,
                label: 'Hacker News',
                tally: item.kids.length
            },
            body: item.text || undefined,
            extras: {
                dead: item.dead,
                score: item.score,
                keywords: item.type
            },
            type: item.type
        };

        self.emit('entry', entry);
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
            hnFirebase.ref('/v0/item/' + storyId).once('value', onItem);
        });
    }


    hnFirebase.ref('/v0/topstories').limitToFirst(30).on('value', onValue);
};
