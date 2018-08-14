'use strict';

const dispatcher = require('../../dispatcher');
const errors = require('restify-errors');

module.exports = (req, res, next) => {
    if (!req.body.length) {
        return next(new errors.BadRequestError('Expected an array'));
    }

    const subs = {
        urls: req.body.filter((param) => {
            return isNaN(param) && param.startsWith('http:');
        }),

        ids: req.body.filter((param) => {
            return isNaN(param) === false;
        })
    };

    if (subs.urls.length === 0 && subs.ids.length === 0) {
        return next(new errors.BadRequestError('No feeds specified'));
    }

    dispatcher.emit('feed-unsubscribe', 1, subs, (err, result) => {
        if (err) {
            return next(new errors.InternalServerError(err.message));
        }
        res.send(result);
        next();
    });
};
