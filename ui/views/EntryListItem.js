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
            m('a.entry', linkAttrs, vnode.attrs.title),
            m('p', vnode.attrs.created)
        ];

        if (vnode.attrs.body) {
            children.push(m('div.body', m.trust(vnode.attrs.body)));
        }

        if (vnode.attrs.discussion) {
            children.push(m(DiscussionList, { discussions: vnode.attrs.discussions}));
        }

        return m('li', children);
    }
};
