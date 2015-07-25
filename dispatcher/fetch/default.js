var needle, needleParsers, normalize, url;

needleParsers = require('needle/lib/parsers');
needleParsers['application/rdf+xml'] = needleParsers['text/xml'];

needle = require('needle');
url = require('url');
normalize = require('../../util/normalize');

module.exports = function (feedId, feedUrl) {
    'use strict';

    var self;

    self = this;

    function getItemUrl (item) {
        var itemUrl;

        if (item['feedburner:origLink']) {
            itemUrl = item['feedburner:origLink'];
        } else if (item.link instanceof Array) {
            itemUrl = item.link.reduce(function (accumulator, link) {
                if ( link.$.type === 'text/html' && link.$.rel === 'alternate') {
                    accumulator = link.$.href;
                }
                return accumulator;
            });
        } else if (item.link) {
            itemUrl = item.link;
        }
        return itemUrl;
    }

    function findUniqueItems (container) {
        var unique;

        unique = container.reduce(function (accumulator, item) {
            var uniqueUrl = getItemUrl(item);
            if (uniqueUrl) {
                uniqueUrl = normalize.url(uniqueUrl);
                if (!accumulator.hasOwnProperty(uniqueUrl)) {
                    accumulator[uniqueUrl] = item;
                }
            }
            return accumulator;
        }, {});

        return Object.keys(unique).map(function (key) {
            return unique[key];
        });
    }

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
            fields.created = item.published;
        } else if (item.pubDate) {
            fields.created = item.pubDate;
        }

        // url
        fields.url = getItemUrl(item);

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
        var itemContainer, itemCount, uniqueItems;

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
            uniqueItems = findUniqueItems(itemContainer);
            uniqueItems.forEach(eachItem);
            itemCount = uniqueItems.length;
        }

        self.emit('fetch:done', feedUrl, response.statusCode, itemCount);
    }

    needle.get(feedUrl, get);
};
