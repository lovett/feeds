'use strict';

import m from 'mithril';

export default {
    view: function (vnode) {
        const linkAttrs = {
            'href': vnode.attrs.url,
            'target': '_blank',
            'rel': 'external noopener noreferrer'
        };

        let children = [
            m('a.entry', linkAttrs, vnode.attrs.title)
        ];

        if (vnode.attrs.discussion) {
            children.push(m(DiscussionList, { discussions: vnode.attrs.discussions}));
        }

        return m('li', children);
    }
};
