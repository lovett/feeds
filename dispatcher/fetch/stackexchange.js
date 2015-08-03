// API Documentation: https://api.stackexchange.com/docs
var needle, url;

needle = require('needle');
url = require('url');

/**
 * Fetch a StackExchange feed using a custom filter
 *
 * Example:
 *
 * {
 *     "tags": [
 *         "start-up"
 *     ],
 *     "owner": {
 *         "reputation": 191,
 *         "user_id": 8937,
 *         "user_type": "registered",
 *         "profile_image": "https://example.com/image",
 *         "display_name": "biocyberman",
 *         "link": "http://example.com/link"
 *     },
 *     "view_count": 59,
 *     "answer_count": 1,
 *     "score": 7,
 *     "creation_date": 1438038783,
 *     "question_id": 14282,
 *     "body_markdown": "This is the body",
 *     "link": "http://example.com/question",
 *     "title": "replace splash screen"
 * }
 *
 */
module.exports = function (args) {
    'use strict';

    var endpoint, parsedUrl, self;

    self = this;
    parsedUrl = url.parse(args.url);
    endpoint = url.format({
        protocol: 'https',
        host: 'api.stackexchange.com',
        pathname: '/2.2/questions',
        query: {
            'site': parsedUrl.host.split('.').shift(),
            'order': 'desc',
            'sort': 'week',
            'filter': '!LaSRLvLuv_4B5l2XT986IL'
        }
    });

    function eachItem (item) {
        var entry = {
            feedId: args.id,
            fetchId: args.fetchId,
            title: item.title,
            createdUtcSeconds: item.creation_date,
            url: item.link,
            body: item.body_markdown,
            author: item.owner.display_name,
            extras: {
                score: item.score,
                keywords: item.tags.join(' ')
            },

            discussion: {
                tally: item.answer_count,
                label: parsedUrl.hostname,
                url: item.link
            }
        };

        self.emit('entry', entry);
    }

    function get (err, response) {
        var itemCount = 0;
        if (err || response.statusCode !== 200) {
            self.emit('log:warn', 'Failed to fetch StackExchange feed', {response: response.statusCode, url: endpoint, error: err});
        }

        if (response.body && response.body.items) {
            itemCount = response.body.items.length;
            response.body.items.forEach(eachItem);
        }

        self.emit('fetch:done', {
            id: args.id,
            fetchId: args.fetchId,
            url: endpoint,
            status: response.statusCode,
            'itemCount': itemCount,
            headers: response.headers
        });
    }

    needle.get(endpoint, get);
};
