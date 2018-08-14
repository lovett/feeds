'use strict';

const dispatcher = require('../../dispatcher');
const errors = require('restify-errors');

module.exports = (req, res, next) => {
    dispatcher.emit('feed-subscribed', 1, (err, result) => {
        if (err) {
            return next(new errors.InternalServerError(err.message));
        }

        res.send({
            meta: {
                labels: {
                    group: 'Subscriptions',
                    edit: 'Edit',
                    create: 'Add',
                    cancelAdd: 'Cancel add',
                    cancelEdit: 'Cancel edit',
                    viewSite: 'View Site',
                    empty: 'No Subscriptions',
                    checkedAgo: 'Checked $1 ago',
                    checkedNext: 'Next check in $1',
                    day: ['day', 'days'],
                    hour: ['hour', 'hours'],
                    minute: ['minute', 'minutes'],
                    overview: 'Overview'
                },

                template: {
                    url: null,
                    title: null,
                    id: null
                },

                fields: [
                    {name: 'url', title: 'URL', type: 'text', create: true, update: false, required: true},
                    {name: 'title', title: 'Title', type: 'text', create: true, update: true, required: false},
                    {name: 'id', title: null, type: 'hidden', create: false, update: false, required: false}
                ]
            },
            data: {
                feeds: result
            }
        });
        next();
    });
};
