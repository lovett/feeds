'use strict';

import m from 'mithril';

import HistoryItem from './HistoryItem';

export default {
    view: function (vnode) {
        let node = null, nodes = [];

        const history = vnode.attrs.history;
        const feedRoute = vnode.attrs.feedRoute;

        if (history === null) {
            return nodes;
        }

        if (history.length === 0) {
            return nodes;
        }

        node = m('a', {
            href: feedRoute,
            oncreate: m.route.link
        }, 'Entries');
        nodes.push(node);

        let table = m('table', [
            m('thead', [
                m('tr', [
                    m('th', history[0].labels.created),
                    m('th', history[0].labels.httpStatus),
                    m('th', history[0].labels.entryCount)
                ])
            ]),
            m('tbody', history.map(item => {
                return m('tr', [
                    m('td', item.created),
                    m('td', item.httpStatus),
                    m('td', item.entryCount),
                ]);
            }))
        ]);

        nodes.push(table);

        return nodes;
    }
};
