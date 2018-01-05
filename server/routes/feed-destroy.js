'use strict';

const dispatcher = require('../../dispatcher');
const errors = require('restify-errors');

module.exports = (req, res, next) => {
    if (!req.params.length) {
        return next(new errors.BadRequestError('Expected an array'));
    }

    const feeds = {
        urls: req.params.filter((param) => {
            return isNaN(param) && param.startsWith('http:');
        }),

        ids: req.params.filter((param) => {
            return isNaN(param) === false;
        })
    };

    if (feeds.urls.length === 0 && feeds.ids.length === 0) {
        return next(new errors.BadRequestError('No feeds specified'));
    }

    dispatcher.emit('feed:purge', feeds, (err, result) => {
        if (err) {
            return next(new errors.InternalServerError(err.message));
        }
        res.send(result);
        next();
    });
};
