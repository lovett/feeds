'use strict';

// API Documentation: https://github.com/reddit/reddit/wiki

const needle = require('needle');
const url = require('url');

/**
 * Fetch a Reddit feed
 */
module.exports = function (args) {
    const self = this;

    const fetchId = crypto.pseudoRandomBytes(10).toString('hex');
    const parsedUrl = url.parse(args.url);
    const subreddit = parsedUrl.path.split('/')[2];
    const jsonUrl = 'https://www.reddit.com/r/' + subreddit + '/.json';

    function eachItem (child) {
        var entry, item;
        item = child.data;

        entry = {
            feedId: args.id,
            fetchId: fetchId,
            title: item.title,
            url: item.url,
            createdUtcSeconds: item.created_utc,
            author: item.author,
            body: item.selftext || undefined,
            extras: {
                score: item.score,
                keywords: item.link_flair_text || undefined
            },
            discussion: {
                tally: item.num_comments,
                label: parsedUrl.hostname,
                url: 'https://' + parsedUrl.hostname + item.permalink
            }
        };

        self.emit('entry', entry);
    }

    function get (err, response) {
        var itemCount = 0;

        if (err || response.statusCode !== 200) {
            self.emit('log:warn', 'Failed to fetch Reddit feed', {status: response.statusCode, url: jsonUrl, error: err});
        }

        if (response.body.data && response.body.data.children) {
            itemCount = response.body.data.children.length;
            response.body.data.children.forEach(eachItem);
        }

        self.emit('fetch:done', {
            id: args.id,
            fetchId: args.fetchId,
            url: jsonUrl,
            status: response.statusCode,
            itemCount: itemCount,
            headers: response.headers
        });
    }



    needle.get(jsonUrl, get);
};
