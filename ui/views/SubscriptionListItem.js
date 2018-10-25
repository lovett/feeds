'use strict';

import m from 'mithril';
import FeedForm from './FeedForm';

export default {
    cssClass: null,

    oninit: function (vnode) {
        if (vnode.attrs.selected) {
            this.activate();
        }
    },

    onbeforeupdate: function (vnode) {
        if (vnode.attrs.selected) {
            this.activate();
        } else {
            this.deactivate();
        }
    },

    activate: function () {
        this.cssClass = 'active';
    },

    deactivate: function () {
        this.cssClass = null;
    },

    asForm: function (vnode) {
        return m(FeedForm, {
            hidden: false,
            values: vnode.attrs.subscription
        });
    },

    view: function (vnode) {
        const id = vnode.attrs.id;
        const title = vnode.attrs.title;
        const url = vnode.attrs.url;
        const route = vnode.attrs.route;
        const sub = vnode.attrs.subscription;
        const editing = vnode.attrs.editing;
        const entryCount = vnode.attrs.entryCount;

        if (editing) {
            return vnode.state.asForm(vnode);
        }

        return m('li', {class: this.cssClass}, [
            m('a.feed', {
                href: route,
                title: url,
                oncreate: m.route.link
            }, title),
            m('span.entry-count', entryCount),
        ]);
    }
};
