'use strict';

import m from 'mithril';

export default class Feed {
    constructor() {
        this.created = null;
        this.entryCount = null;
        this.fetched = null;
        this.id = null;
        this.nextFetch = null;
        this.siteUrl = null;
        this.subscribed = null;
        this.title = null;
        this.url = null;
        this.entries = [];
        this.labels = [];
        this.active = false;
        this.history = [];
        this.labels = {
            history: {}
        };
    }

    getHistoryLabel(key) {
        return this.labels.history[key];
    }

    load() {
        if (this.entries.length > 0) {
            return;
        }

        m.request({
            method: 'GET',
            url: `/feed/${this.id}`,
            withCredentials: true
        }).then((res) => {
            this.entries = res.data.entries;
        });
    }

    loadHistory() {
        if (this.history.length > 0) {
            return;
        }

        return m.request({
            method: 'GET',
            url: `/history/${this.id}`,
            withCredentials: true
        }).then((res) => {
            this.history = res.data.entries;
            this.labels['history'] = res.meta.labels;
        });
    }

    isNewlyAdded() {
        const age = Math.abs(this.subscribed - Date.now()/1000);
        return this.entryCount === 0 && age < 20;
    }

    isStale(lastFetch) {
        return this.nextFetch < lastFetch;
    }

    get nextFetchFormatted() {
        return new Date(this.nextFetch * 1000).toLocaleString();
    }


    static fromObject(obj) {
        let feed = new Feed();

        const validKeys = Object.keys(feed);

        const assignableKeys = Object.keys(obj).filter((key) => {
            return validKeys.indexOf(key) !== -1;
        });

        for (let key of assignableKeys) {
            feed[key] = obj[key];
        }
        return feed;
    }
}
