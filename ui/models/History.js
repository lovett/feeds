'use strict';

import m from 'mithril';

import formatter from '../formatter';

export default {
    endpoint: '/history',
    entries: [],
    fields: [],

    load: function (feedId) {
        return m.request({
            method: 'GET',
            url: `${this.endpoint}/${feedId}`,
            withCredentials: true
        }).then((res) => {
            this.entries = res.data.entries.map((entry) => {
                return formatter(entry, res.meta.fields);
            });
            this.fields = res.meta.fields;
        });
    },
};
