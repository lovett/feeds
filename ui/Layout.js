'use strict';

import m from 'mithril';

export default {
    view: function(vnode) {
        return m('#app', vnode.children);
    }
};
