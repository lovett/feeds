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

        const labelledEntries = entries.map(entry => {
            return {
                created: {
                    value: entry.created,
                    label: 'Fetch Date',
                    treat_as: 'date'
                },

                httpStatus: {
                    value: entry.httpStatus,
                    label: 'HTTP Status Code'
                },

                entryCount: {
                    value: entry.entryCount,
                    label: 'Entries Added'
                }
            };
        });

        res.send(labelledEntries);
        next();
    });
};
