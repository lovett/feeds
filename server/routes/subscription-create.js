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

    dispatcher.emit('feed:watch', 1, feeds, (err, result) => {
        if (err) {
            return next(new errors.InternalServerError(err.message));
        }
        res.send(result);
        next();
    });
};
