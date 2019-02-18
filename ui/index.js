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
            if (Subscription.isSubscribed(vnode.attrs.key) === false) {
                m.route.set('/');
                return;
            }

            const feed = Subscription.activate(vnode.attrs.key);

            if (feed === undefined) {
                return;
            }

            const sections = [
                m('section#subscriptions', m(SubscriptionList, {
                    feed,
                })),
            ];

            feed.loadEntries();
            sections.push(
                m('section#feed-detail', m(EntryList, {
                    feed
                }))
            );

            return m(Layout, sections);
        }
    },

    '/feed/:key/history': {
        render: (vnode) => {
            if (Subscription.isSubscribed(vnode.attrs.key) === false) {
                m.route.set('/');
                return;
            }

            const feed = Subscription.activate(vnode.attrs.key);

            if (feed === undefined) {
                return;
            }

            const sections = [
                m('section#subscriptions', m(SubscriptionList, {
                    feed,
                })),
            ];

            feed.loadHistory();
            sections.push(
                m('section#history', m(History, {
                    feedRoute: `/feed/${feed.id}`,
                    history: feed.history
                }))
            );

            return m(Layout, sections);
        }
    }
});
