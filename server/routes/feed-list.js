'use strict';

const dispatcher = require('../../dispatcher');
const errors = require('restify-errors');

module.exports = (req, res, next) => {
    dispatcher.emit('feed:list', (err, result) => {
        if (err) {
            return next(new errors.InternalServerError(err.message));
        }

        res.send(result);
        next();
    });
};
