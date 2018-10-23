'use strict';

import m from 'mithril';

import History from '../models/History';
import HistoryItem from './HistoryItem';

export default {
    oninit: function (vnode) {
        History.load(vnode.attrs.key);
    },

    view: function (vnode) {
        let node = null, nodes = [];

        node = m('a', {
            href: `/feed/${vnode.attrs.key}`,
            oncreate: m.route.link
        }, 'Entries');
        nodes.push(node);

        let table = m('table', [
            m('thead', [
                m('tr', History.fields.map(function (field) {
                    return m('th', field.title);
                }))
            ]),
            m('tbody', History.entries.map(function (entry) {
                return m(HistoryItem, entry);
            }))
        ]);

        nodes.push(table);

        return nodes;
    }
};
