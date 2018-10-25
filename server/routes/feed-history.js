'use strict';

const dispatcher = require('../../dispatcher');
const errors = require('restify-errors');

module.exports = (req, res, next) => {
    const feedId = parseInt(req.params.feedId, 10) || 0;

    if (feedId === 0) {
        return next(new errors.BadRequestError('No feed specified'));
    }

    dispatcher.emit('stats-by-feed', feedId, (err, entries) => {
        if (err) {
            return next(err);
        }

        res.send({
            meta: {
                labels: {
                    created: 'Date',
                    httpStatus: 'HTTP Status Code',
                    entryCount: 'Entries Added'
                }
            },

            data: {
                entries: entries
            }
        });
        next();
    });
};
