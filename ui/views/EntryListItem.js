'use strict';

import m from 'mithril';
import DiscussionList from './DiscussionList';
import SaveButton from './SaveButton';

export default {
    view: function (vnode) {
        const entry = vnode.attrs.entry;

        if (entry.read) {
            return null;
        }

        const linkAttrs = {
            'href': entry.url,
            'target': '_blank',
            'rel': 'external noopener noreferrer'
        };

        let children = [
            m('a.entry', linkAttrs, entry.title),
            m(SaveButton, {entry: entry}),
            m('p', entry.created)
        ];

        if (entry.body) {
            children.push(m('div.body', m.trust(entry.body)));
        }

        if (entry.discussions) {
            children.push(m(DiscussionList, {
                discussions: entry.discussions
            }));
        }

        return m('li', children);
    }
};
