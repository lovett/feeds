var url = require('url');

/**
 * Figure out how to fetch a feed
 * --------------------------------------------------------------------
 * Feeds from Reddit, StackExchange, and Hacker News are requested via
 * their respective APIs. All other feeds are requested via the Google
 * Feed API.
 */

module.exports = function (feedId, feedUrl, subscribers) {
    var host, fetchEvent;

    console.log(feedId);
    console.log(feedUrl);

    host = url.parse(feedUrl).host;

    if (host.indexOf('reddit.com') > -1) {
        fetchEvent = 'fetch:reddit';
    } else if (host.indexOf('stackexchange.com') > -1) {
        fetchEvent = 'fetch:stackexchange';
    } else if (host === 'news.ycombinator.com') {
        fetchEvent = 'fetch:hn';
    } else {
        fetchEvent = 'fetch:default';
    }

    this.emit(fetchEvent, feedId, feedUrl, subscribers);
};
