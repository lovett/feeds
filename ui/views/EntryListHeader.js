'use strict';

import m from 'mithril';

export default {
    view: function (vnode) {
        let node = null, nodes = [];

        node = m('p', [
            m('a', {
                target: '_blank',
                rel: 'external noopener noreferrer',
                href: vnode.attrs.siteUrl
            }, 'Visit site')
        ]);
        nodes.push(node);

        node = m('p', `Fetched on ${vnode.attrs.fetched}`);
        nodes.push(node);

        node = m('p', `Next fetch: ${vnode.attrs.nextFetch}`);
        nodes.push(node);

        node = m('p', `Subscribed since ${vnode.attrs.subscribed}`);
        nodes.push(node);

        node = m('a', {
            href: `/feed/${vnode.attrs.id}/history`,
            oncreate: m.route.link
        }, 'History');
        nodes.push(node);


        return m('header', nodes);
        return nodes;
    }
};
