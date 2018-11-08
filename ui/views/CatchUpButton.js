'use strict';

import m from 'mithril';

export default {
    view: function (vnode) {
        const feed = vnode.attrs.feed;

        let onclick = () => feed.save();
        let label = 'Done with these';

        if (entry.saved) {
            onclick = () => entry.unsave();
            label = 'unsave';
        }

        return m('button', {onclick,}, label);
    }
};
