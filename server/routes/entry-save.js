'use strict';

const dispatcher = require('../../dispatcher');
const errors = require('restify-errors');

module.exports = (req, res, next) => {
    const entryId = parseInt(req.params.entryId, 10) || 0;

    if (entryId === 0) {
        return next(new errors.BadRequestError('Invalid entry'));
    }

    dispatcher.emit('entry-user-update', 1, entryId, {saved: true}, (err) => {
        if (err) {
            return next(new errors.InternalServerError(err.message));
        }

        res.send(204);
        next();
    });
};
