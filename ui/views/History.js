'use strict';

import m from 'mithril';

import HistoryItem from './HistoryItem';

export default {
    view: function (vnode) {
        const feed = vnode.attrs.feed;
        const history = vnode.attrs.history;

        let node = null, nodes = [];

        node = m('a', {
            href: `/feed/${feed.id}`,
            oncreate: m.route.link
        }, 'Entries');
        nodes.push(node);


        let table = m('table', [
            m('thead', [
                m('tr', Object.keys(feed.labels.history).map(key => {
                    return m('th', feed.getHistoryLabel(key));
                }))
            ]),
            m('tbody', history.map(function (entry) {
                return m(HistoryItem, entry);
            }))
        ]);

        nodes.push(table);

        return nodes;
    }
};
