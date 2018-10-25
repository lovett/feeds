'use strict';

import m from 'mithril';

import Overview from './views/Overview';
import Layout from './Layout';
import SubscriptionList from './views/SubscriptionList';
import EntryList from './views/EntryList';
import History from './views/History';

import Subscription from './models/Subscription';

Subscription.startPolling();

m.route(document.body, '/', {
    '/': {
        render: () => {
            Subscription.activate(null);
            return m(Layout, [
                m('section#subscriptions', m(SubscriptionList, {
                    feed: null,
                })),
                m('section#overview', m(Overview))
            ]);
        }
    },

    '/feed/:key': {
        render: (vnode) => {
            const feed = Subscription.activate(vnode.attrs.key);
            if (!feed) {
                return;
            }

            feed.load();

            return m(Layout, [
                m('section#subscriptions', m(SubscriptionList, {
                    feed,
                })),
                m('section#feed-detail', m(EntryList, {
                    feed: feed,
                    entries: feed.entries
                }))
            ]);
        }
    },

    '/feed/:key/history': {
        render: (vnode) => {
            const feed = Subscription.activate(vnode.attrs.key);
            if (!feed) {
                return;
            }

            feed.loadHistory();

            return m(Layout, [
                m('section#subscriptions', m(SubscriptionList, {
                    feed,
                })),
                m('section#history', m(History, {
                    feed,
                    history: feed.history
                }))
            ]);
        }
    }

});
