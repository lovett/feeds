'use strict';

const dispatcher = require('../../dispatcher');
const errors = require('restify-errors');

module.exports = (req, res, next) => {
    if (Array.isArray(req.body.entryIds) === false) {
        return next(new errors.BadRequestError('Expected a list of entry ids'));
    }

    if (!req.body.fields) {
        return next(new errors.BadRequestError('No fields specified'));
    }

    const entryIds = req.body.entryIds.map(id => parseInt(id, 10) || 0).filter(id => id > 0);

    dispatcher.emit('entry-user-batch-update', 1, entryIds, req.body.fields, (err) => {
        if (err) {
            return next(new errors.InternalServerError(err.message));
        }

        res.send(204);
        next();
    });
};
