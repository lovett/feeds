'use strict';

const crypto = require('crypto');
const needle = require('needle');
const url = require('url');
const FeedParser = require('feedparser');

module.exports = function (feedId, feedUrl) {
    const self = this;

    const fetchId = crypto.pseudoRandomBytes(10).toString('hex');

    function captureEntry(item) {
        let entry = {
            feedUrl: feedUrl,
            feedId: feedId,
            fetchId: fetchId,
            author: item.author,
            title: item.title,
            created: item.pubdate,
            url: (item.origlink || item.link),
            extras: {
                keywords: item.categories
            },
            discussion: {
                url: null,
                label: null,
                tally: null
            }
        };

        if (item.comments) {
            entry.discussion.url = item.comments;

            if (item['slash:comments']) {
                entry.discussion.tally = parseInt(item['slash:comments'], 10);
            }
        }

        if (item['slash:section']) {
            entry.extras.keywords.push(item['slash:section']['#']);
        }

        self.emit('entry:store', entry);
    }

    const parser = new FeedParser();
    parser.on('error', function (err) {
        if (err) {
            self.emit('log:error', `Error parsing ${feedUrl}: ${err.message}`);
        }
    });

    parser.on('readable', function () {
        self.emit('feed:update', feedId, {
            title: this.meta.title,
            description: this.meta.description,
            link: this.meta.link,
            xmlurl: this.meta.xmlurl,
            date: this.meta.date,
        });

        let item = null;
        while (item = this.read()) {
            captureEntry(item);
        }
    });

    const stream = needle.get(feedUrl, {
        open_timeout: 5000,
        response_timeout: 10000,
        follow_max: 2,
        parse_response: false
    });

    stream.pipe(parser);

    stream.on('done', function (err) {
        if (err) {
            self.emit('log:error', `Error fetching ${feedUrl}: ${err.message}`);
        }
    });
};
