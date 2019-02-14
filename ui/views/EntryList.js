'use strict';

import m from 'mithril';

import EntryListHeader from './EntryListHeader';
import EntryListItem from './EntryListItem';
import EntryListStub from './EntryListStub';

export default {
    view: function (vnode) {
        const feed = vnode.attrs.feed;
        const entries = feed.entries;

        console.log(entries);

        let node = null, nodes = [];

        node = m(EntryListHeader, {
            feed,
            hasEntries: entries.length > 0
        });
        nodes.push(node);

        if (entries.length === 0) {
            node = m(EntryListStub);
            nodes.push(node);
        }

        if (entries.length > 0) {
            node = m('ul', entries.map(function (entry) {
                return m(EntryListItem, {
                    entry,
                });
            }));
            nodes.push(node);
        }

        return nodes;
    }
};
