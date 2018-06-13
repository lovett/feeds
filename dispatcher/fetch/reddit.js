'use strict';

const crypto = require('crypto');
const needle = require('needle');
const url = require('url');

/**
 * Fetch a Reddit feed
 */
module.exports = function (feedId, feedUrl) {
    const self = this;

    const baseUrl = 'https://www.reddit.com';
    const fetchId = crypto.pseudoRandomBytes(10).toString('hex');
    const parsedUrl = url.parse(feedUrl);
    const subreddit = parsedUrl.path.split('/')[2];
    const jsonUrl = `${baseUrl}/r/${subreddit}/.json`;

    function processItem (item) {

        const data = item.data;

        if (data.author.toLowerCase() === 'automoderator') {
            self.emit('log:debug', 'Skipping automoderator item');
            return;
        }

        if (data.stickied) {
            self.emit('log:debug', 'Skipping stickied item');
            return;
        }

        const entry = {
            feedUrl: feedUrl,
            feedId: feedId,
            fetchId: fetchId,
            author: data.author,
            title: data.title,
            created: new Date(item.created_utc * 1000),
            url: data.url,
            body: data.selftext || null,
            extras: {
                score: data.score,
                keywords: data.link_flair_text || undefined
            },
            discussion: {
                tally: data.num_comments,
                label: data.subreddit_name_prefixed,
                url: `${baseUrl}/${data.permalink}`
            }
        };

        self.emit('entry:store', entry);
    }

    needle.get(jsonUrl, (err, res) => {
        if (err) {
            self.emit('log:error', `Failed to fetch Reddit JSON: ${err.message}`);
            self.emit(
                'stats:fetch',
                feedId,
                fetchId,
                res.statusCode,
                0
            );
            return;
        }

        if (!res.body.data.children) {
            self.emit('log:warning', 'Reddit JSON feed has no children');
            self.emit(
                'stats:fetch',
                feedId,
                fetchId,
                res.statusCode,
                0
            );
            return;
        }

        const newestDate = res.body.data.children.reduce((acc, entry) => {
            if (entry.created_utc > acc) {
                acc = entry.created_utc;
            }
            return acc;
        }, 0);

        const firstEntry = res.body.data.children[0].data;

        self.emit('feed:update', feedId, {
            title: `Reddit ${firstEntry.subreddit}`,
            link: `${baseUrl}/${firstEntry.subreddit_name_prefixed}`,
            xmlurl: `${baseUrl}/${firstEntry.subreddit_name_prefixed}/.rss`,
            date: new Date(newestDate * 1000)
        });


        res.body.data.children.forEach(processItem);
    });
};
