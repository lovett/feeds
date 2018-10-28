'use strict';

import m from 'mithril';
import Subscription from '../models/Subscription';
import SubscriptionListItem from './SubscriptionListItem';
import FeedForm from './FeedForm';
import Strings from '../Strings';

/**
 * Container for a list of subscribed feeds.
 */
export default {
    view: function (vnode) {
        let node = null, nodes = [];

        // heading
        node = m('header', Strings.subscriptionHeading());
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
        }, Strings.createSubscription());
        actions.push(node);

        // cancel add
        node = m('a.cancel-add', {
            href: '#',
            hidden: !Subscription.adding,
            onclick: (e) => {
                e.preventDefault();
                Subscription.adding = false;
            }
        }, Strings.createSubscriptionCancel());
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
            }, Strings.editSubscription());
            actions.push(node);

            // cancel edit
            node = m('a.cancel-edit', {
                href: '#',
                hidden: !Subscription.editing,
                onclick: (e) => {
                    e.preventDefault();
                    Subscription.editing = false;
                }
            }, Strings.editSubscriptionCancel());
            actions.push(node);
        }

        nodes.push(m('.actions', actions));

        // add form
        node = m(FeedForm, {
            hidden: !Subscription.adding,
            values: Subscription.newFeed
        });
        nodes.push(node);

        let feedList = [];
        node = m(SubscriptionListItem, {
            selected: vnode.attrs.feed === null,
            title: Strings.overview(),
            route: '/',
            url: null,
            editing: false,
        });
        feedList.push(node);

        Subscription.feeds.forEach((feed) => {
            let node = m(SubscriptionListItem, {
                selected: feed === vnode.attrs.feed,
                editing: Subscription.editing,
                title: feed.title,
                url: feed.url,
                route: `/feed/${feed.id}`,
                id: feed.id,
                entryCount: feed.entryCount,
                subscription: feed
            });
            feedList.push(node);
        });

        node = m('ul.feeds', feedList);
        nodes.push(node);

        return nodes;
    }
};
