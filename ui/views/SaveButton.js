'use strict';

import m from 'mithril';

export default {
    view: function (vnode) {
        const entry = vnode.attrs.entry;

        let onclick = () => entry.save();
        let label = 'save';

        if (entry.saved) {
            onclick = () => entry.unsave();
            label = 'unsave';
        }

        return m('button', {onclick,}, label);
    }
};
