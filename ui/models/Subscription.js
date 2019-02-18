'use strict';

import m from 'mithril';
import Feed from './Feed';

let intervalId = null;

export default {
    endpoint: '/subscription',
    feeds: [],
    labels: {},
    fields: [
        {name: 'url', title: 'URL', type: 'text', create: true, update: false, required: true},
        {name: 'title', title: 'Title', type: 'text', create: true, update: true, required: false},
        {name: 'id', title: null, type: 'hidden', create: false, update: false, required: false},
        {name: 'nextFetch', title: null, type: 'timestamp', create: false, update: false, required: false},
        {name: 'subscribed', title: null, type: 'timestamp', create: false, update: false, required: false}
    ],
    template: {
        url: null,
        title: null,
        id: null
    },
    newFeed: {},
    fetchedOn: null,
    adding: false,
    editing: false,

    isSubscribed: function (feedId) {
        feedId = parseInt(feedId, 10);
        if (!this.hasFetched()) {
            return undefined;
        }

        return this.feeds.some(feed => feed.id === feedId);
    },

    activate: function (feedId) {
        feedId = parseInt(feedId, 10);
        this.feeds.forEach((feed) => {
            feed.active = feed.id === feedId;
        });

        return this.getActiveFeed();
    },

    getActiveFeed: function () {
        return this.feeds.find(feed => feed.active);
    },

    hasFeeds: function () {
        return this.feeds.length > 0;
    },

    hasFetched: function() {
        return this.fetchedOn !== null;
    },

    getLabel: function (key) {
        return this.labels[key];
    },

    load: function () {
        return m.request({
            method: 'GET',
            url: this.endpoint,
            withCredentials: true,
            type: Feed
        }).then((feeds) => {
            this.feeds = feeds;
            // this.fields = res.meta.fields;
             this.newFeed = Object.assign({}, this.template);
        }).finally(() => {
            this.fetchedOn = new Date();
        });
    },

    stopPolling: function () {
        clearInterval(intervalId);
        intervalId = null;
    },

    startPolling: function (intervalSeconds=3) {
        if (intervalId !== null) {
            return;
        }

        this.poll();
        this.intervalId = setInterval(this.poll.bind(this), intervalSeconds * 1000);
    },

    poll: function () {
        // Fetch if this is the first poll.
        if (this.hasFetched() === false) {
            this.load();
            return;
        }

        // Fetch if a feed has just been added.
        const newlyAdded = this.feeds.some(feed => feed.isNewlyAdded());

        if (newlyAdded) {
            this.load();
            return;
        }

        return;

        // Fetch if any feeds have passed their nextFetch date.
        const stale = this.feeds.some(feed => feed.isStale);

        if (stale) {
            this.load();
            return;
        }
    },

    save: function (feed) {
        const method = (feed.id)? 'PUT' : 'POST';

        return m.request({
            method: method,
            url: this.endpoint,
            data: [feed],
            withCredentials: true
        }).then((res) => {
            this.load();
            this.adding = false;
            this.editing = false;
        }).catch((e) => {
            console.log(e);
        });
    },

    update: function (feed) {
        alert('Feed update has not yet been implemented.');
    },

    remove: function (feed) {
        return m.request({
            method: 'DELETE',
            url: this.endpoint,
            data: [feed.id],
            withCredentials: true
        }).then(() => {
            this.feeds = this.feeds.filter((item) => item !== feed);
        }).catch((e) => {
            console.log(e);
        });
    }
};
