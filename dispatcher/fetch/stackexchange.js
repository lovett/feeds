var url = require('url');
var needle = require('needle');

/**
 * Fetch a StackExchange feed
 * --------------------------------------------------------------------
 */
module.exports = function (feedId, feedUrl, subscribers) {
    var callbacks, parsedUrl, endpoint;

    callbacks.needleGet = function (err, response) {
        if (err) {
            this.insist('schedule', feedId, err);
            return;
        }

        if (response.statusCode !== 200) {
            this.insist('schedule', feedId, response.statusCode);
            return;
        }

        response.body.items.forEach(callbacks.eachItem.bind(this));
        this.insist('reschedule', feedId);
    };

    /*jshint camelcase:false */
    callbacks.eachItem = function (item) {
        var fields = {
            stackComments: item.answer_count,
            url: item.link,
            title: item.title,
            date: item.creation_date
        };
        
        this.insist('entry:store', feedId, fields, subscribers);
    };

    parsedUrl = url.parse(feedUrl);

    endpoint = url.format({
        protocol: 'https',
        host: 'api.stackexchange.com',
        pathname: '/2.2/questions',
        query: {
            'site': parsedUrl.host.split('.').shift(),
            'order': 'desc',
            'sort': 'week',
            'filter': '!)R7_Ydm)7LrqRF9BkudkXj*v' // answer_count, score, creation_date, link, title
        }
    });
    
    needle.get(endpoint, callbacks.needleGet.bind(this));
};
