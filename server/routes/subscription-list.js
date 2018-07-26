'use strict';

const dispatcher = require('../../dispatcher');
const errors = require('restify-errors');

module.exports = (req, res, next) => {
    dispatcher.emit('feed:watched', 1, (err, result) => {
        if (err) {
            return next(new errors.InternalServerError(err.message));
        }

        res.send({
            meta: {
                labels: {
                    group: 'Subscriptions',
                    edit: 'Edit Subscriptions',
                    create: 'Add Subscription',
                    cancelAdd: 'Cancel Add',
                    cancelEdit: 'Cancel Edit',
                    viewSite: 'View Site',
                    empty: 'No Subscriptions',
                    checked: 'Checked',
                    day: ['day', 'days'],
                    hour: ['hour', 'hours'],
                    minute: ['minute', 'minutes'],
                    ago: '$1 ago'
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
