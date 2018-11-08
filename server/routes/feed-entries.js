'use strict';

const dispatcher = require('../../dispatcher');
const errors = require('restify-errors');

module.exports = (req, res, next) => {
    const feedId = parseInt(req.params.feedId, 10) || 0;

    if (feedId === 0) {
        return next(new errors.BadRequestError('No feed specified'));
    }

    dispatcher.emit('feed-entries', feedId, 1, true, 50, 0, (err, entries) => {
        let entryIds = entries.reduce((accumulator, row) => {
            accumulator.push(row.id);
            return accumulator;
        }, []);

        if (entryIds.length === 0) {
            res.send([]);
            next();
            return;
        }

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


            const labelledEntries = entriesWithDiscussions.map(entry => {
                return {
                    id: {
                        label: 'ID',
                        value: entry.id
                    },
                    url: {
                        label: 'URL',
                        value: entry.url
                    },
                    title: {
                        label: 'Title',
                        value: entry.title
                    },
                    author: {
                        label: 'Author',
                        value: entry.author
                    },
                    created: {
                        value: entry.created,
                        label: 'Date',
                        treat_as: 'date'
                    },
                    body: {
                        value: entry.body,
                        label: 'Content'
                    },
                    keywords: {
                        value: entry.extras.keywords,
                        label: 'Keywords'
                    },
                    discussions: {
                        value: entry.discussions,
                        label: 'Discussions'
                    },
                    read: {
                        value: Boolean(entry.read),
                        label: 'Read'
                    },
                    saved: {
                        value: Boolean(entry.saved),
                        label: 'Saved',
                    },
                    _links: {
                        save_entry: `/entry/${entry.id}/save`,
                        unsave_entry: `/entry/${entry.id}/unsave`,
                    }
                };
            });

            res.send(labelledEntries);
            next();
        });
    });
};
