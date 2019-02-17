'use strict';

import m from 'mithril';

import EntryListHeader from './EntryListHeader';
import EntryListItem from './EntryListItem';
import EntryListStub from './EntryListStub';

export default {
    view: function (vnode) {
        const feed = vnode.attrs.feed;

        let node = null, nodes = [];

        node = m(EntryListHeader, {
            feed
        });

        nodes.push(node);

        if (feed.hasUnreadEntries === false) {
            node = m(EntryListStub);
            nodes.push(node);
        }

        if (feed.hasUnreadEntries === true) {
            node = m('ul', feed.unreadEntries.map(function (entry) {
                return m(EntryListItem, {
                    entry,
                });
            }));
            nodes.push(node);
        }

        return nodes;
    }
};
