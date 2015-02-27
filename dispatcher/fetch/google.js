var url = require('url');
var needle = require('needle');
var moment = require('moment');

/**
 * Fetch a feed via Google's Feed API
 * --------------------------------------------------------------------
 */
module.exports = function (feedId, feedUrl, subscribers) {
    var callbacks, parsedUrl, endpoint, headers;

    callbacks = {};

    callbacks.needleGet = function (err, response) {
        if (err) {
            this.insist('schedule', feedId, err);
            return;
        }

        if (response.statusCode !== 200) {
            this.insist('schedule', feedId, response.statusCode);
            return;
        }

        this.insisty('log:trace', {feedId: feedId, feedUrl: feedUrl}, 'google feed api queried successfully');

        var feed = response.body.responseData.feed;

        feed.entries.reverse().forEach(callbacks.eachEntry.bind(this));

        // Warn if there are no entries in the feed
        if (feed.entries.length === 0) {
            this.insist('log:warn', {feedId: feedId, feedUrl: feedUrl, googleUrl: endpoint}, 'no entries found');
        }

        // Update the feed URL if Google indicates a different one
        if (feedUrl !== feed.feedUrl) {
            this.insist('feed:update', feedId,  {url: feed.feedUrl});
        }

        this.insist('schedule', feedId);
        
    };

    callbacks.eachEntry = function (entry) {
        var fields = {
            url: entry.link,
            title: entry.title.replace(/<\/?.*?>/g, ''),
            date: moment(new Date(entry.publishedDate)).format('X') * 1000
        };

        this.insist('entry:store', feedId, fields, subscribers);
    };
    
    parsedUrl = url.parse(feedUrl);

    endpoint = url.format({
        'protocol': 'https:',
        'host': 'ajax.googleapis.com',
        'pathname': '/ajax/services/feed/load',
        'query': {
            'v': '1.0',
            'q': feedUrl,
            'userip': process.env.HEADLINES_IP,
            'num': -1,
            'output': 'json'
        }
    });

    headers = {
        'Referer': process.env.HEADLINES_URL
    };

    this.insist('log:info', {feedId: feedId, feedUrl: feedUrl, googleUrl: endpoint}, 'querying google feed api');

    needle.get(endpoint, headers, callbacks.needleGet.bind(this));
};
