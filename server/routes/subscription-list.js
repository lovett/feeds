'use strict';

const dispatcher = require('../../dispatcher');
const errors = require('restify-errors');

module.exports = (req, res, next) => {
    dispatcher.emit('feed-subscribed', 1, (err, feeds) => {
        if (err) {
            return next(new errors.InternalServerError(err.message));
        }

        const labelledFeeds = feeds.map(feed => {
            return {
                title: {
                    value: feed.title,
                    label: 'Title'
                },
                id: {
                    value: feed.id,
                    label: 'ID'
                },
                url: {
                    value: feed.url,
                    label: 'URL',
                },
                siteUrl: {
                    value: feed.siteUrl,
                    label: 'Site URL',
                },
                entryCount: {
                    value: feed.entryCount,
                    label: 'Entries',
                },
                subscribed: {
                    value: feed.subscribed,
                    label: 'Subscribed on',
                    treat_as: 'date'
                },
                nextFetch: {
                    value: feed.nextFetch,
                    label: 'Next fetch',
                    treat_as: 'date'
                },
                fetched: {
                    value: feed.fetched,
                    label: 'Last fetch',
                    treat_as: 'date'
                }
            };
        });

        res.send(labelledFeeds);
        next();
    });
};
