'use strict';

import m from 'mithril';

export default {
    view: function (vnode) {
        const feed = vnode.attrs.feed;
        const hasEntries = vnode.attrs.hasEntries;

        const entries = [];

        let node = null, nodes = [];

        node = m('p', [
            m('a', {
                target: '_blank',
                rel: 'external noopener noreferrer',
                href: feed.siteUrl
            }, 'Visit site')
        ]);
        nodes.push(node);

        node = m('p', `Fetched on ${feed.fetched}`);
        nodes.push(node);

        node = m('p', `Next fetch: ${feed.nextFetch}`);
        nodes.push(node);

        node = m('p', `Subscribed since ${feed.subscribed}`);
        nodes.push(node);

        node = m('a', {
            href: `/feed/${feed.id}/history`,
            oncreate: m.route.link
        }, 'History');
        nodes.push(node);

        if (hasEntries > 0) {
            node = m('button', {
                onclick: () => feed.markAllRead(),
            }, 'Mark all read');
            nodes.push(node);
        }

        return m('header', nodes);
        return nodes;
    }
};
