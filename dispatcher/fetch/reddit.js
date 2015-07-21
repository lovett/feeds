var needle, url;

needle = require('needle');
url = require('url');

/**
 * Fetch a Reddit feed
 * --------------------------------------------------------------------
 */
module.exports = function (feedId, feedUrl, subscribers) {
    'use strict';

    var jsonUrl, parsedUrl, self, subreddit;

    self = this;
    parsedUrl = url.parse(feedUrl);
    subreddit = parsedUrl.path.split('/')[2];
    jsonUrl = 'https://www.reddit.com/r/' + subreddit + '/.json';

    function eachItem (child) {
        var entry, fields;
        entry = child.data;

        /*jshint camelcase:false */
        fields = {
            title: entry.title,
            createdUtc: entry.created_utc,
            url: entry.url,
            discussion: {
                tally: entry.num_comments,
                label: parsedUrl.hostname,
                url: 'https://' + parsedUrl.hostname + entry.permalink
            }
        };

        self.emit('entry', feedId, fields, subscribers);
    }

    function get (err, response) {
        var itemCount = 0;

        if (err || response.statusCode !== 200) {
            self.emit('log:warn', 'Failed to fetch feed', {status: response.statusCode, url: jsonUrl, err: err});
        }

        if (response.body.data && response.body.data.children) {
            itemCount = response.body.data.children.length;
            response.body.data.children.forEach(eachItem);
        }

        self.emit('fetch:reddit:done', jsonUrl, response.statusCode, itemCount);
    }



    needle.get(jsonUrl, get);
};
