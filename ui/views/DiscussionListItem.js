'use strict';

import m from 'mithril';

export default {
    view: function (vnode) {
        const discussion = vnode.attrs.discussion;
        const link = m('a', {'href': discussion.url}, discussion.label);
        return m('li', link);
    }
};
