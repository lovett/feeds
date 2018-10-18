'use strict';

const Subscription = require('./Subscription');

const SubscriptionViewModel = {
    fetching: false,
    timestamps: {},
    activeId: null,

    /**
     * Update the last-checked-on value of each feed.
     *
     * Caller is responsible for calling m.redraw().
     */
    // refreshTimestamps: function () {
    //     this.timestamps = this.feeds.reduce((accumulator, feed) => {
    //         const labelTemplate = this.getLabel('checkedAgo');
    //         accumulator[feed.id] = Util.reldate(feed.fetched, labelTemplate);
    //         return accumulator;
    //     }, {});
    // },

};

module.exports = SubscriptionViewModel;
