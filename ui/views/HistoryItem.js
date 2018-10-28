'use strict';

import m from 'mithril';

export default {
    view: function (vnode) {
        const item = vnode.attrs;
        return m('tr', Object.keys(item).map((key) => {
            return m('td', item[key]);
        }));
    }
};
