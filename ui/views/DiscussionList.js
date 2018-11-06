'use strict';

import m from 'mithril';
import DiscussionListItem from './DiscussionListItem';

export default {
    view: function (vnode) {
        const items = vnode.attrs.discussions.map(function (discussion) {
            return m(DiscussionListItem, {
                discussion,
            });
        });

        return m('ul.discussions', items);
    }
};
