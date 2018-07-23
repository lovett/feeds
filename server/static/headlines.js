const SubscriptionViewModel = {
    adding: false,
    editing: false,
    newFeed: {},
    feeds: [],
    labels: {},
    fields: [],
    template: {},

    getLabel: function (key) {
        return this.labels[key];
    },

    hasFeeds: function () {
        return this.feeds.length > 0;
    },

};

const Subscription = {
    endpoint: '/subscription',

    load: function () {
        return m.request({
            method: 'GET',
            url: this.endpoint,
            withCredentials: true,
        }).then((res) => {
            const data = res.data;
            const meta = res.meta;
            SubscriptionViewModel.feeds = data.feeds;
            SubscriptionViewModel.labels = meta.labels;
            SubscriptionViewModel.fields = meta.fields;
            SubscriptionViewModel.template = meta.template;
            SubscriptionViewModel.newFeed = Object.assign({}, meta.template);
        });
    },

    save: function (feed) {
        let method = 'POST';
        if (feed.id) {
            method = 'PUT';
        }

        return m.request({
            method: method,
            url: this.endpoint,
            data: [feed],
            withCredentials: true
        }).then((res) => {
            this.load();
            SubscriptionViewModel.adding = false;
            SubscriptionViewModel.editing = false;
        }).catch((e) => {
            console.log(e);
        });
    },

    update: function (feed) {
        alert('Feed update has not yet been implemented.');
    },

    remove: function (feed) {
        return m.request({
            method: 'DELETE',
            url: this.endpoint,
            data: [feed.id],
            withCredentials: true
        }).then((res) => {
            SubscriptionViewModel.feeds = SubscriptionViewModel.feeds.reduce((accumulator, item) => {
                if (item !== feed) {
                    accumulator.push(item);
                }
                return accumulator;
            }, []);
        }).catch((e) => {
            console.log(e);
        });
    }
};

/**
 * Container for a list of subscribed feeds.
 */
const SubscriptionList = {
    oninit: function () {
        Subscription.load();
    },

    view: function (vnode) {
        let node = null, nodes = [];

        // heading
        node = m('header', SubscriptionViewModel.getLabel('group'));
        nodes.push(node);

        // add link
        node = m('p', m('a', {
            href: '#',
            hidden: SubscriptionViewModel.adding,
            onclick: (e) => {
                e.preventDefault();
                SubscriptionViewModel.adding = true;
            }
        }, SubscriptionViewModel.getLabel('create')));
        nodes.push(node);

        // cancel add
        node = m('p', m('a', {
            href: '#',
            hidden: !SubscriptionViewModel.adding,
            onclick: (e) => {
                e.preventDefault();
                SubscriptionViewModel.adding = false;
            }
        }, SubscriptionViewModel.getLabel('cancelAdd')));
        nodes.push(node);

        // add form
        node = m(FeedForm, {
            hidden: !SubscriptionViewModel.adding,
            values: SubscriptionViewModel.newFeed
        });
        nodes.push(node);

        // edit link
        if (SubscriptionViewModel.hasFeeds()) {
            node = m('p', m('a', {
                href: '#',
                hidden: SubscriptionViewModel.editing,
                onclick: (e) => {
                    e.preventDefault();
                    SubscriptionViewModel.editing = true;
                }
            }, SubscriptionViewModel.getLabel('edit')));
            nodes.push(node);

            // cancel edit
            node = m('p', m('a', {
                href: '#',
                hidden: !SubscriptionViewModel.editing,
                onclick: (e) => {
                    e.preventDefault();
                    SubscriptionViewModel.editing = false;
                }
            }, SubscriptionViewModel.getLabel('cancelEdit')));
            nodes.push(node);
        } else {
            node = m('p', SubscriptionViewModel.getLabel('empty'));
            nodes.push(node);
        }


        // feed list
        node = m('ul', SubscriptionViewModel.feeds.map((feed) => {
            return m('li', m(SubscriptionListItem, {
                editing: SubscriptionViewModel.editing,
                subscription: feed
            }));
        }));
        nodes.push(node);

        return nodes;
    }
};

const SubscriptionListItem = {
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

        return m('li', [
            m('a.feed', {
                href: `/feed/${sub.id}`,
                title: sub.url,
                oncreate: m.route.link
            }, sub.title),
            m('span.entry-count', sub.entryCount),
            m('a.site', {
                href: sub.siteUrl,
                hidden: !sub.siteUrl,
                target: '_blank',
                rel: 'external noopener noreferrer'
            }, SubscriptionViewModel.getLabel('viewSite'))
        ]);
    }
};


const FeedViewModel = {
    entries: [],
    labels: [],
    getLabel: function (key) {
        return this.labels[key];
    }
};

const Feed = {
    endpoint: '/feed',

    load: function (feedId) {
        return m.request({
            method: 'GET',
            url: `${this.endpoint}/${feedId}`,
            withCredentials: true
        }).then((res) => {
            const data = res.data;
            const meta = res.meta;

            FeedViewModel.entries = data.entries;
            this.labels = meta.labels;
        });
    }
};

const EntryList = {
    oninit: function (vnode) {
        Feed.load(vnode.attrs.key);
    },

    view: function (vnode) {
        let nodes = [];

        let node = m('header', FeedViewModel.getLabel('group'));
        nodes.push(node);

        node = m('ul', FeedViewModel.entries.map(function (entry) {
            return m(EntryListItem, entry);
        }));
        nodes.push(node);

        return nodes;
    }
};

const EntryListItem = {
    view: function (vnode) {
        const linkAttrs = {
            'href': vnode.attrs.url,
            'target': '_blank',
            'rel': 'external noopener noreferrer'
        };

        let children = [
            m('a.entry', linkAttrs, vnode.attrs.title)
        ];

        if (vnode.attrs.discussion) {
            children.push(m(DiscussionList, { discussions: vnode.attrs.discussions}));
        }

        return m('li', children);
    }
};

const DiscussionList = {
    view: function (vnode) {
        return m('ul.discussions', vnode.attrs.discussions.map(function (discussion) {
            return m(DiscussionListItem, discussion);
        }));
    }
};

const DiscussionListItem = {
    view: function (vnode) {
        const discussion = vnode.attrs;

        let label = '';
        if (discussion.commentCount) {
            label = discussion.commentCount;
            label += ' ' + ((discussion.commentCount === 1)? 'comment' : 'comments');
        }

        if (discussion.label === 'self') {
            return m('li', label);
        }

        if (discussion.url) {
            label += `${discussion.label}: ${label}`;
            return m('li', {}, m('a', {'href': discussion.url}, label));
        }
    }
};

const FormFieldGroup = {
    view: function (vnode) {
        return m('.field', vnode.children);
    }
};

const FeedForm = {
    view: function (vnode) {
        let fields = SubscriptionViewModel.fields.reduce((accumulator, field) => {
            if (SubscriptionViewModel.adding && field.create === false) {
                return accumulator;
            }

            if (SubscriptionViewModel.editing && field.type === 'hidden') {
                accumulator.push(m('input', {
                    type: field.type,
                    name: field.name,
                    value: vnode.attrs.values[field.name]
                }));
                return accumulator;
            }

            if (SubscriptionViewModel.editing && field.update === false) {
                return accumulator;
            }

            let fieldGroup = m(FormFieldGroup, [
                m('label', field.title),
                m('input', {
                    type: field.type,
                    name: field.name,
                    oninput: m.withAttr('value', (value) => {
                        vnode.attrs.values[field.name] = value;
                    }),
                    required: field.required,
                    value: vnode.attrs.values[field.name]
                })
            ]);

            accumulator.push(fieldGroup);
            return accumulator;
        }, []);

        let buttons = [
            m('button', 'save')
        ];

        if (vnode.attrs.values.id) {
            buttons.push(m('button', {
                onclick: function (e) {
                    e.preventDefault();
                    Subscription.remove(vnode.attrs.values);
                }
            }, 'unsubscribe'));
        }

        fields.push(
            m(FormFieldGroup, buttons)
        );

        let formAttrs = {
            hidden: vnode.attrs.hidden,
            onsubmit: function (e) {
                e.preventDefault();
                Subscription.save(vnode.attrs.values);
            }
        };

        return m('form', formAttrs, fields);
    }
};

const Layout = {
    view: function(vnode) {
        let sections = [m('section#subscriptions', m(SubscriptionList))];
        return m('#app', sections.concat(vnode.children));
    }
};

m.route(document.body, '/', {
    '/': {
        render: () => {
            return m(Layout, []);
        }
    },

    '/feed/:key': {
        render: (vnode) => {
            return m(Layout, [
                m('section#entries', m(EntryList, vnode.attrs))
            ]);
        }
    }
});
