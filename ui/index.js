'use strict';

import m from 'mithril';

import Overview from './views/Overview';
import Layout from './Layout';
import SubscriptionList from './views/SubscriptionList';
import EntryList from './views/EntryList';

m.route(document.body, '/', {
    '/': {
        render: () => {
            return m(Layout, [
                m('section#subscriptions', m(SubscriptionList)),
                m('section#overview', m(Overview))
            ]);
        }
    },

    '/feed/:key': {
        render: (vnode) => {
            return m(Layout, [
                m('section#subscriptions', m(SubscriptionList, {
                    active: parseInt(vnode.attrs.key, 10)
                })),
                m('section#entries', m(EntryList, vnode.attrs))
            ]);
        }
    }
});
