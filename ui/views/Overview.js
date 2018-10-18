'use strict';

import m from 'mithril';
import Subscription from '../models/Subscription';

export default {
    message: null,

    onbeforeupdate: function (vnode) {
        if (Subscription.hasFetched()) {
            vnode.state.message = `Subscribed to ${Subscription.feeds.length} feeds`;
        }
    },

    view: function (vnode) {
        return m('p', vnode.state.message);
    }
};
