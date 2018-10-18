'use strict';

import m from 'mithril';
import Subscription from '../models/Subscription';
import SubscriptionListItem from './SubscriptionListItem';
import FeedForm from './FeedForm';

/**
 * Container for a list of subscribed feeds.
 */
export default {
    oninit: function (vnode) {
        Subscription.startPolling();
    },



    view: function (vnode) {
        let node = null, nodes = [];

        // heading
        node = m('header', Subscription.getLabel('group'));
        nodes.push(node);

        let actions = [];

        // add link
        node = m('a.add', {
            href: '#',
            hidden: Subscription.adding,
            onclick: (e) => {
                e.preventDefault();
                Subscription.adding = true;
                Subscription.editing = false;
            }
        }, Subscription.getLabel('create'));
        actions.push(node);

        // cancel add
        node = m('a.cancel-add', {
            href: '#',
            hidden: !Subscription.adding,
            onclick: (e) => {
                e.preventDefault();
                Subscription.adding = false;
            }
        }, Subscription.getLabel('cancelAdd'));
        actions.push(node);

        // edit link
        if (Subscription.hasFeeds()) {
            node = m('a.edit', {
                href: '#',
                hidden: Subscription.editing,
                onclick: (e) => {
                    e.preventDefault();
                    Subscription.editing = true;
                    Subscription.adding = false;
                }
            }, Subscription.getLabel('edit'));
            actions.push(node);

            // cancel edit
            node = m('a.cancel-edit', {
                href: '#',
                hidden: !Subscription.editing,
                onclick: (e) => {
                    e.preventDefault();
                    Subscription.editing = false;
                }
            }, Subscription.getLabel('cancelEdit'));
            actions.push(node);
        }

        nodes.push(m('.actions', actions));

        // add form
        node = m(FeedForm, {
            hidden: !Subscription.adding,
            values: Subscription.newFeed
        });
        nodes.push(node);

        // feed list
        if (Subscription.hasFeeds()) {
            console.log('yes');
            node = m('ul.feeds', Subscription.feeds.map((feed) => {
                return m(SubscriptionListItem, {
                    selected: feed.id === vnode.attrs.active,
                    editing: Subscription.editing,
                    subscription: feed
                });
            }));
            nodes.push(node);
        }

        return nodes;
    }
};
