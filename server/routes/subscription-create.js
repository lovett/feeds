'use strict';

const dispatcher = require('../../dispatcher');
const errors = require('restify-errors');

module.exports = (req, res, next) => {
    if (!req.body.length) {
        return next(new errors.BadRequestError('Expected an array'));
    }

    const feeds = req.body.filter((feed) => {
        return feed.hasOwnProperty('url');
    });

    if (feeds.length === 0) {
        return next(new errors.BadRequestError('Nothing to add'));
    }

    dispatcher.emit('feed-add', feeds, (err, addedFeeds) => {
        if (err) {
            return next(new errors.InternalServerError(err.message));
        }

        const subscriptions = addedFeeds.map((addedFeed) => {
            let subscription  = feeds.find(feed => feed.url === addedFeed.url);
            subscription.id = addedFeed.id;
            return subscription;
        });

        dispatcher.emit('feed-subscribe', 1, subscriptions, (err, subscribeResult) => {
            res.send(subscribeResult);
            next();
        });
    });
};
