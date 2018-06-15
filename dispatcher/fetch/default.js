'use strict';

const crypto = require('crypto');
const needle = require('needle');
const FeedParser = require('feedparser');

module.exports = function (feedId, feedUrl) {
    const self = this;

    const fetchId = crypto.pseudoRandomBytes(10).toString('hex');

    let guids = [];

    function captureEntry(item) {
        let entry = {
            feedUrl: feedUrl,
            feedId: feedId,
            fetchId: fetchId,
            author: item.author,
            title: item.title,
            created: item.pubdate,
            guid: item.guid,
            url: (item.origlink || item.link),
            extras: {
                keywords: item.categories
            },
            discussion: {
                url: null,
                label: 'self',
                commentCount: null
            }
        };

        if (item.guid) {
            guids.push(item.guid);
        }

        if (item.comments) {
            entry.discussion.url = item.comments;

            if (item['slash:comments']) {
                entry.discussion.commentCount = parseInt(
                    item['slash:comments'],
                    10
                );
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
            self.emit(
                'log:error',
                `Error parsing ${feedUrl}: ${err.message}`
            );
        }
    });

    parser.on('meta', function (meta) {
        self.emit(
            'feed:update',
            feedId,
            {
                description: meta.description,
                siteUrl: meta.link,
                title: meta.title,
                updated: meta.date,
                url: meta.xmlurl
            }
        );
    });

    parser.on('readable', function () {
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
            self.emit(
                'log:error',
                `Error fetching ${feedUrl}: ${err.message}`
            );
        }

        if (guids) {
            setTimeout(() => {
                self.emit('discussion:recount', feedUrl, guids);
            }, 5000);
        }


        let statusCode = 0;
        if (this.request && this.request.res) {
            statusCode = this.request.res.statusCode;
        }

        self.emit(
            'stats:fetch',
            feedId,
            fetchId,
            statusCode
        );
    });
};
