'use strict';

import m from 'mithril';

import Feed from '../models/Feed';
import EntryListItem from './EntryListItem';

export default {
    oninit: function (vnode) {
        Feed.load(vnode.attrs.key);
    },

    view: function (vnode) {
        let node = null, nodes = [];

        node = m('a', {
            href: `/feed/${vnode.attrs.key}/history`,
            oncreate: m.route.link
        }, 'History');
        nodes.push(node);

        node = m('ul', Feed.entries.map(function (entry) {
            return m(EntryListItem, entry);
        }));
        nodes.push(node);

        return nodes;
    }
};
