'use strict';

const dispatcher = require('../../dispatcher');
const errors = require('restify-errors');

module.exports = (req, res, next) => {
    const feedId = parseInt(req.params.feedId, 10) || 0;

    if (feedId === 0) {
        return next(new errors.BadRequestError('No feed specified'));
    }

    dispatcher.emit('feed:entries', feedId, 1, (err, entries) => {
        let entryIds = entries.reduce((accumulator, row) => {
            accumulator.push(row.id);
            return accumulator;
        }, []);

        dispatcher.emit('discussion:list', entryIds, (err, discussions) => {
            let discussionsByEntry = discussions.reduce((accumulator, discussion) => {
                let entryId = discussion.entryId;
                delete discussion.entryId;

                if (!accumulator.hasOwnProperty(entryId)) {
                    accumulator[entryId] = [];
                }

                accumulator[entryId].push(discussion);
                return accumulator;
            }, {});

            let entriesWithDiscussions = entries.reduce((accumulator, entry) => {
                entry.discussions = [];
                if (discussionsByEntry.hasOwnProperty(entry.id)) {
                    entry.discussions = discussionsByEntry[entry.id];
                }
                accumulator.push(entry);
                return accumulator;
            }, []);

            res.send(entriesWithDiscussions);
            next();
        });
    });
};
