'use strict';

// API documentation: https://github.com/HackerNews/API

const crypto = require('crypto');
const firebase = require('firebase');

const itemLimit = 30;

let firebaseDb = null;

module.exports = function (feedId, feedUrl) {
    const self = this;

    const fetchId = crypto.pseudoRandomBytes(10).toString('hex');

    let itemCounter = 0;

    function processItem(snapshot) {
        itemCounter++;

        const item = snapshot.val();

        if (item) {
            const entry = {
                feedUrl: feedUrl,
                feedId: feedId,
                fetchId: fetchId,
                author: item.by,
                title: item.title,
                created: new Date(item.time * 1000),
                url: item.url,
                extras: {
                    dead: item.dead,
                    score: item.score,
                    keywords: item.type
                },
                discussion: {
                    url: 'https://news.ycombinator.com/item?id=' + item.id,
                    label: 'news.ycombinator.com',
                    commentCount: item.descendants
                },
                body: item.text
            };

            self.emit('entry:store', entry);
            console.log(entry);
        }

        if (itemCounter === itemLimit) {
            self.emit('feed:update', feedId, {date: new Date()});
            firebaseDb.goOffline();
        }
    }

    if (!firebaseDb) {
        firebaseDb = firebase.initializeApp(
            { databaseURL: 'https://hacker-news.firebaseio.com/' }
        ).database();
    } else {
        firebaseDb.goOnline();
    }

    const topstories = firebaseDb.ref('/v0/topstories');

    topstories.limitToFirst(itemLimit).once('value', function (snapshot) {
        snapshot.val().forEach(function (id) {
            firebaseDb.ref('/v0/item/' + id).once('value', processItem);
        });
    });
};
