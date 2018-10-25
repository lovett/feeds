'use strict';

import m from 'mithril';

import EntryListItem from './EntryListItem';

export default {
    view: function (vnode) {
        const feed = vnode.attrs.feed;
        const entries = vnode.attrs.entries;

        let node = null, nodes = [];

        node = m('a', {
            href: `/feed/${feed.id}/history`,
            oncreate: m.route.link
        }, 'History');
        nodes.push(node);

        node = m('p', `Next fetch: ${feed.nextFetchFormatted}`);
        nodes.push(node);

        node = m('ul', entries.map(function (entry) {
            return m(EntryListItem, entry);
        }));
        nodes.push(node);

        return nodes;
    }
};
