'use strict';

import m from 'mithril';

export default {
    endpoint: '/feed',
    entries: [],
    labels: [],

    getLabel: function (key) {
        return this.labels[key];
    },

    load: function (feedId) {
        return m.request({
            method: 'GET',
            url: `${this.endpoint}/${feedId}`,
            withCredentials: true
        }).then((res) => {
            this.entries = res.data.entries;
            this.labels = res.meta.labels;
        });
    }
};
