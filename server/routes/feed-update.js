'use strict';

const dispatcher = require('../../dispatcher');
const errors = require('restify-errors');

module.exports = (req, res, next) => {
    if (!req.params.length) {
        return next(new errors.BadRequestError('Expected an array'));
    }

    const feeds = req.params.filter((feed) => {
        return feed.hasOwnProperty('id');
    });

    if (feeds.length === 0) {
        return next(new errors.BadRequestError('Nothing to update'));
    }

    dispatcher.emit('feed:update', feeds, (err, result) => {
        if (err) {
            return next(new errors.InternalServerError(err.message));
        }
        res.send(result);
        next();
    });
};
