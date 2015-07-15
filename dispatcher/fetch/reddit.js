var url = require('url');
var needle = require('needle');

/**
 * Fetch a Reddit feed
 * --------------------------------------------------------------------
 */
module.exports = function (db, feedId, feedUrl, subscribers) {
    var self, parsedUrl, subreddit, jsonUrl;

    self = this;
    parsedUrl = url.parse(feedUrl);
    subreddit = parsedUrl.path.split('/')[2];
    jsonUrl = 'https://www.reddit.com/r/' + subreddit + '/.json';

    function get (err, response) {
        var itemCount = 0;
        if (response.statusCode !== 200) {
            self.emit('log:warn', {url: jsonUrl, response: response.statusCode});
        }

        if (response.body.data && response.body.data.children) {
            itemCount = response.body.data.children.length;
            response.body.data.children.forEach(eachItem);
        }

        self.emit('fetch:reddit:done', jsonUrl, response.statusCode, itemCount);
    }

    
    function eachItem (child) {
        var entry, fields;
        entry = child.data;

        /*jshint camelcase:false */
        fields = {
            title: entry.title,
            createdUtc: entry.created_utc,
            url: entry.url,
            discussions: {
                tally: entry.num_comments,
                name: parsedUrl.hostname,
                url: 'https://' + parsedUrl.hostname + entry.permalink,
            }
        };

        self.emit('entry:store', db, feedId, fields, subscribers);
    }

    needle.get(jsonUrl, get);
};
