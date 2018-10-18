'use strict';

import m from 'mithril';

export default {
    view: function (vnode) {
        return m('.field', vnode.children);
    }
};
