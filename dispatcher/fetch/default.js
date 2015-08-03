var needle, needleParsers, normalize, url;

needleParsers = require('needle/lib/parsers');
needleParsers['application/rdf+xml'] = needleParsers['text/xml'];

needle = require('needle');
url = require('url');
normalize = require('../../util/normalize');

module.exports = function (args) {
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

    function addKeyword(entry, keyword) {
        if (entry.extras.keywords) {
            entry.extras.keywords += ' ' + keyword;
        } else {
            entry.extras.keywords = keyword;
        }
        return entry;
    }

    function findUniqueItems (container) {
        var unique;

        unique = container.reduce(function (accumulator, item, index) {
            var uniqueUrl = getItemUrl(item);
            if (!uniqueUrl) {
                accumulator[index] = item;
            } else {
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
        var entry, parsedCommentsUrl;

        entry = {
            extras: {}
        };

        // author
        if (item.author && item.author.name) {
            entry.author = item.author.name;
        } else if (item['dc:creator']) {
            entry.author = item['dc:creator'];
        } else if (item.author) {
            entry.author = item.author;
        }

        // title
        if (item.title && item.title._ && item.title.$.type === 'text') {
            entry.title = item.title._;
        } else if (item.title) {
            entry.title = item.title;
        }

        // created
        if (item.published) {
            entry.created = item.published;
        } else if (item.pubDate) {
            entry.created = item.pubDate;
        }

        // url
        entry.url = getItemUrl(item);

        // discussion
        if (item.comments) {
            parsedCommentsUrl = url.parse(item.comments);
            entry.discussion = {
                url: item.comments,
                label: parsedCommentsUrl.hostname
            };
        } else if (item['slash:comments']) {
            parsedCommentsUrl = url.parse(entry.url);
            entry.discussion = {
                url: entry.url,
                tally: parseInt(item['slash:comments'], 10),
                label: parsedCommentsUrl.hostname
            };
        }

        // keywords
        if (item.category) {
            if (item.category instanceof Array) {
                entry.extras.keywords = item.category.reduce(function (acc, category) {
                    if (category.$ && category.$.term) {
                        acc += ' ' + category.$.term;
                    }
                    return acc.trim();
                }, '');
            } else {
                entry.extras.keywords = item.category;
            }
        }

        if (item['dc:subject']) {
            entry = addKeyword(entry, item['dc:subject']);
        }

        if (item['slash:section']) {
            entry = addKeyword(entry, item['slash:section']);
        }

        entry.feedUrl = args.url;
        entry.feedId = args.id;
        entry.fetchId = args.fetchId;

        self.emit('entry', entry);
    }

    function get (err, response) {
        var itemContainer, itemCount, uniqueItems;

        itemCount = 0;

        if (err || response.statusCode !== 200) {
            self.emit('log:warn', 'Failed to fetch feed', {response: response.statusCode, url: args.url, error: err});
        }

        if (response.body.feed) {
            itemContainer = response.body.feed.entry;
        } else if (response.body.rss && response.body.rss.channel) {
            itemContainer = response.body.rss.channel.item;
        } else if (response.body['rdf:RDF']) {
            itemContainer = response.body['rdf:RDF'].item;
        } else {
            self.emit('log:warn', 'Unable to identify item container', { url: args.url });
        }

        if (itemContainer) {
            uniqueItems = findUniqueItems(itemContainer);
            uniqueItems.forEach(eachItem);
            itemCount = uniqueItems.length;
        }

        self.emit('fetch:done', {
            id: args.id,
            fetchId: args.fetchId,
            feedUrl: args.url,
            status: response.statusCode,
            itemCount: itemCount,
            headers: response.headers
        });
    }

    needle.get(args.url, get);
};
