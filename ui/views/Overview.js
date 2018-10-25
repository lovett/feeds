'use strict';

import m from 'mithril';
import Subscription from '../models/Subscription';

export default {
    view: function (vnode) {
        let message = null;
        if (Subscription.hasFetched()) {
            message = `Subscribed to ${Subscription.feeds.length} feeds`;
        }
        return m('p', message);
    }
};
