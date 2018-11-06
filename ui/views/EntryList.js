'use strict';

import m from 'mithril';

import EntryListHeader from './EntryListHeader';
import EntryListItem from './EntryListItem';

export default {
    view: function (vnode) {
        const feed = vnode.attrs.feed;
        const entries = vnode.attrs.entries;

        let node = null, nodes = [];

        node = m(EntryListHeader, {
            url: feed.url,
            siteUrl: feed.siteUrl,
            url: feed.url,
            subscribed: feed.subscribed,
            fetched: feed.fetched,
            id: feed.id,
            nextFetch: feed.nextFetch
        });
        nodes.push(node);


        node = m('ul', entries.map(function (entry) {
            return m(EntryListItem, {
                entry,
            });
        }));
        nodes.push(node);

        return nodes;
    }
};
