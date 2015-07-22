var moment, needle, needleParsers, url;

needleParsers = require('needle/lib/parsers');
needleParsers['application/rdf+xml'] = needleParsers['text/xml'];

needle = require('needle');
url = require('url');
moment = require('moment');

module.exports = function (feedId, feedUrl) {
    'use strict';

    var self;

    self = this;

    function eachItem (item) {
        var fields, parsedCommentsUrl;

        fields = {};

        // title
        if (item.title && item.title._ && item.title.$.type === 'text') {
            fields.title = item.title._;
        } else if (item.title) {
            fields.title = item.title;
        }

        // created
        if (item.published) {
            fields.createdUtc = moment(new Date(item.published)).format('X') * 1000;
        } else if (item.pubDate) {
            fields.createdUtc = moment(item.pubDate).format('X') * 1000;
        }

        // url
        if (item['feedburner:origLink']) {
            fields.url = item['feedburner:origLink'];
        } else if (item.link instanceof Array) {
            fields.url = item.link.reduce(function (accumulator, link) {
                if ( link.$.type === 'text/html' && link.$.rel === 'alternate') {
                    accumulator = link.$.href;
                }
                return accumulator;
            });
        } else if (item.link) {
            fields.url = item.link;
        }

        // discussion
        if (item.comments) {
            parsedCommentsUrl = url.parse(item.comments);
            fields.discussion = {
                url: item.comments,
                label: parsedCommentsUrl.hostname
            };
        }

        self.emit('entry', feedId, fields);
    }

    function get (err, response) {
        var itemContainer, itemCount;

        itemCount = 0;

        if (err || response.statusCode !== 200) {
            self.emit('log:warn', 'Failed to fetch feed', {response: response.statusCode, url: feedUrl, error: err});
        }

        if (response.body.feed) {
            itemContainer = response.body.feed.entry;
        } else if (response.body.rss && response.body.rss.channel) {
            itemContainer = response.body.rss.channel.item;
        } else if (response.body['rdf:RDF']) {
            itemContainer = response.body['rdf:RDF'].item;
        } else {
            self.emit('log:warn', 'Unable to identify item container', { url: feedUrl });
        }

        if (itemContainer) {
            itemCount = itemContainer.length;
            itemContainer.forEach(eachItem);
        }

        self.emit('fetch:default:done', feedUrl, response.statusCode, itemCount);
    }

    needle.get(feedUrl, get);
};
