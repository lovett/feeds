'use strict';

import m from 'mithril';
import FeedForm from './FeedForm';
import Subscription from '../models/Subscription';

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
        const sub = vnode.attrs.subscription;

        if (vnode.attrs.editing) {
            return vnode.state.asForm(vnode);
        }

        return m('li', {class: this.cssClass}, [
            m('a.feed', {
                href: `/feed/${sub.id}`,
                title: sub.url,
                oncreate: m.route.link
            }, sub.title),
            m('span.entry-count', sub.entryCount),
        ]);
    }
};
