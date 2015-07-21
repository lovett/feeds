var needle, url;

needle = require('needle');
url = require('url');

/**
 * Fetch a StackExchange feed
 *
 * The filter used on the API request returns answer_count, score,
 * creation_date, link, title
 * --------------------------------------------------------------------
 */
module.exports = function (feedId, feedUrl, subscribers) {
    'use strict';

    var endpoint, parsedUrl, self;

    self = this;
    parsedUrl = url.parse(feedUrl);
    endpoint = url.format({
        protocol: 'https',
        host: 'api.stackexchange.com',
        pathname: '/2.2/questions',
        query: {
            'site': parsedUrl.host.split('.').shift(),
            'order': 'desc',
            'sort': 'week',
            'filter': '!)R7_Ydm)7LrqRF9BkudkXj*v'
        }
    });

    function eachItem (item) {
        /*jshint camelcase:false */
        var fields = {
            title: item.title,
            createdUtc: item.creation_date,
            url: item.link,
            discussion: {
                tally: item.answer_count,
                label: parsedUrl.hostname,
                url: item.link
            }
        };

        self.emit('entry', feedId, fields, subscribers);
    }

    function get (err, response) {
        var itemCount = 0;
        if (err || response.statusCode !== 200) {
            self.emit('log:warn', 'Failed to fetch feed', {response: response.statusCode, url: endpoint, err: err});
        }

        if (response.body && response.body.items) {
            itemCount = response.body.items.length;
            response.body.items.forEach(eachItem);
        }

        self.emit('fetch:stackexchange:done', endpoint, response.statusCode, itemCount);
    }

    needle.get(endpoint, get);
};
