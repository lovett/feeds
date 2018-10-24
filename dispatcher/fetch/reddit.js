'use strict';

const crypto = require('crypto');
const needle = require('needle');
const url = require('url');

/**
 * Fetch a Reddit feed
 */
module.exports = function (feedId, feedUrl, callback = () => {}) {
    const self = this;

    const baseUrl = 'https://www.reddit.com';
    const fetchId = crypto.pseudoRandomBytes(10).toString('hex');
    const parsedUrl = url.parse(feedUrl);
    const subreddit = parsedUrl.path.split('/')[2];
    const jsonUrl = `${baseUrl}/r/${subreddit}/.json`;

    function processItem (item, isLast) {

        const data = item.data;

        if (data.author && data.author.toLowerCase() === 'automoderator') {
            self.emit('log:debug', 'Skipping automoderator item');
            if (isLast) {
                callback();
            }
            return;
        }

        if (data.stickied) {
            self.emit('log:debug', 'Skipping stickied item');
            if (isLast) {
                callback();
            }
            return;
        }

        let entry = {
            feedUrl: feedUrl,
            feedId: feedId,
            fetchId: fetchId,
            author: data.author,
            title: data.title,
            created: new Date(item.created_utc * 1000),
            url: data.url,
            body: null,
            extras: {
                score: data.score,
                keywords: []
            },
            discussion: {
                commentCount: data.num_comments,
                label: data.subreddit_name_prefixed,
                url: `${baseUrl}/${data.permalink}`
            }
        };

        if (data.selftext) {
            entry.body = data.selftext;
        }

        if (data.link_flair_text) {
            const keywords = data.link_flair_text.split(' ');
            entry.extras.keywords = keywords.map(keyword => keyword.toLowerCase());
        }

        self.emit('entry-store', entry);

        if (isLast) {
            callback();
        }
    }

    needle.get(jsonUrl, (err, res) => {
        if (err) {
            self.emit('log:error', `Failed to fetch Reddit JSON: ${err.message}`);
            self.emit(
                'stats-fetch',
                feedId,
                fetchId,
                0,
                0
            );
            return;
        }

        if (!res.body.data || !res.body.data.children || res.body.data.children.length < 1) {
            self.emit('log:warning', 'Reddit JSON feed has no children');
            self.emit(
                'stats-fetch',
                feedId,
                fetchId,
                res.statusCode,
                0
            );
            return;
        }

        const newestDate = res.body.data.children.reduce((acc, entry) => {
            if (entry.data.created_utc > acc) {
                acc = entry.data.created_utc;
            }
            return acc;
        }, 0);

        const firstEntry = res.body.data.children[0].data;

        self.emit(
            'stats-fetch',
            feedId,
            fetchId,
            res.statusCode,
            false
        );

        self.emit(
            'feed-update',
            feedId,
            {
                siteUrl: `${baseUrl}/${firstEntry.subreddit_name_prefixed}`,
                title: `Reddit ${firstEntry.subreddit}`,
                updated: new Date(newestDate * 1000),
                url: `${baseUrl}/${firstEntry.subreddit_name_prefixed}/.rss`
            }
        );

        for (let i=0; i < res.body.data.children.length; i++) {
            let isLast = i === res.body.data.children.length - 1;
            processItem(res.body.data.children[i], isLast);
        }
    });
};
