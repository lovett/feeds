'use strict';

const dispatcher = require('../../dispatcher');
const errors = require('restify-errors');

module.exports = (req, res, next) => {
    if (!req.body.length) {
        return next(new errors.BadRequestError('Expected an array'));
    }

    const feeds = req.body.filter((feed) => {
        return feed.hasOwnProperty('id');
    });

    if (feeds.length === 0) {
        return next(new errors.BadRequestError('Nothing to update'));
    }

    dispatcher.emit('feed-update', feeds, (updateCount) => {
        res.send({
            fieldsUpdated: updateCount
        });

        next();
    });
};
