'use strict';

import m from 'mithril';
import FetchStat from './FetchStat';
import Entry from './Entry';
import Base from './Base';
import DateTimeMixin from '../mixins/DateTime';
import PopulateMixin from '../mixins/Populate';

export default class Feed extends PopulateMixin(DateTimeMixin(Base)) {
    constructor(data) {
        super();
        this.created = null;
        this.entryCount = null;
        this.fetched = null;
        this.id = null;
        this.nextFetch = null;
        this.siteUrl = null;
        this.subscribed = null;
        this.title = null;
        this.url = null;
        this.entries = null;
        this.active = false;
        this.history = null;
        this.populate(data);
    }

    get canLoadEntries() {
        if (this.entries === null) {
            return true;
        }

        if (this.isStale === true) {
            return true;
        }

        return false;
    }

    get canLoadHistory() {
        if (this.history === null) {
            return true;
        }

        if (this.isStale === true) {
            return true;
        }

        return false;
    }

    get isStale() {
        return this._nextFetch < new Date();
    }


    loadEntries() {
        if (this.canLoadEntries === false) {
            return;
        }

        return m.request({
            method: 'GET',
            url: `/feed/${this.id}`,
            withCredentials: true,
            type: Entry
        }).then((entries) => {
            this.entries = entries;
            this.entryCount = entries.length;
        }).catch(e => {
            console.log(e);
        });
    }

    loadHistory() {
        if (this.canLoadHistory === false) {
            return;
        }

        return m.request({
            method: 'GET',
            url: `/history/${this.id}`,
            withCredentials: true,
            type: FetchStat
        }).then(history => {
            this.history = history;
        }).catch(e => {
            console.log(e);
        });
    }

    isNewlyAdded() {
        const age = (new Date() - this._subscribed)/1000;
        return this.entryCount === 0 && age < 20;
    }

    markAllRead() {
        const ids = this.unreadEntries.map(entry => entry.id);

        const route = this.links.mark_entries_read;
        return m.request({
            method: route.method,
            url: route.url,
            withCredentials: true,
            data: {
                entryIds: ids,
                fields: {
                    read: true
                }
            }
        }).then(res => {
            this.unreadEntries.forEach(entry => entry.read = true);
            this.entryCount = 0;
        }).catch(e => {
            console.log(e);
        });
    }

    set nextFetch(value) {
        this._nextFetch = new Date(value * 1000);
    }

    get nextFetch() {
        return this.toTime(this._nextFetch);
    }

    set fetched(value) {
        this._fetched = new Date(value * 1000);
    }

    get fetched() {
        return this.toTime(this._fetched);
    }

    set subscribed(value) {
        this._subscribed = new Date(value * 1000);
    }

    get subscribed() {
        return this.toTimeOrDate(this._subscribed);
    }

    get unreadEntries() {
        if (this.entries === null) {
            return false;
        }

        return this.entries.filter(entry => entry.read === false);
    }

    get hasUnreadEntries() {
        if (this.entries === null) {
            return false;
        }

        return this.entries.some(entry => entry.read === false);
    }
}
