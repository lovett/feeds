var url = require('url');
var needle = require('needle');

/**
 * Fetch a Reddit feed
 * --------------------------------------------------------------------
 */
module.exports = function (feedId, feedUrl, subscribers) {
    var callbacks, parsedUrl, jsonUrl, subreddit;

    parsedUrl = url.parse(feedUrl);

    callbacks = {};

    parsedUrl = url.parse(feedUrl);
    subreddit = parsedUrl.path.split('/')[2];

    jsonUrl = 'https://www.reddit.com/r/' + subreddit + '/.json';
    console.log(jsonUrl);

    callbacks.needleGet = function (err, response) {
        if (err) {
            this.insist('schedule', feedId, err);
            return;
        }

        if (response.statusCode !== 200) {
            this.insist('schedule', feedId, response.statusCode);
            return;
        }

        response.body.data.children.forEach(callbacks.eachItem.bind(this));
        this.insist('schedule', feedId);
    };

    /*jshint camelcase:false */
    callbacks.eachItem = function (child) {
        var entry, fields;
        entry = child.data;
        fields = {
            redditComments: entry.num_comments,
            redditLink: 'https://' + parsedUrl.hostname + entry.permalink,
            title: entry.title,
            date: entry.created_utc,
            url: entry.url
        };

        this.insist('entry:store', feedId, fields, subscribers);
    };

    needle.get(jsonUrl, callbacks.needleGet.bind(this));
};
