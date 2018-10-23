'use strict';

import m from 'mithril';

export default {
    view: function (vnode) {
        return m('tr', Object.keys(vnode.attrs).map((key) => {
            return m('td', vnode.attrs[key]);
        }));
    }
};
