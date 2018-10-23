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
                labels: {},

                template: {},

                fields: [
                    {name: 'created', title: 'Date', type: 'timestamp', create: false, update: false},
                    {name: 'httpStatus', title: 'HTTP Status Code', type: 'number', create: false, update: false},
                    {name: 'entryCount', title: 'Entries Added', type: 'number', create: false, update: false},
                ],
            },

            data: {
                entries: entries
            }
        });
        next();
    });
};
