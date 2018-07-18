/**
 * */
const Subscriptions = {
    list: [],

    load: () => {
        console.log('loading subscriptions');
        return m.request({
            method: 'GET',
            url: '/subscription',
            withCredentials: true,
        }).then((data) => {
            Subscriptions.list = data;
        });
    },
};

const SubscriptionList = {
    oninit: function () {
        Subscriptions.load();
    },

    view: function () {
        const listItems = Subscriptions.list.map(function (subscription) {
            return m(SubscriptionListItem, subscription);
        });

        return m('ul#subscription-list', listItems);
    }
};

const SubscriptionListItem = {
    view: function (vnode) {
        const link = m('a', {
            'href': `/feed/${vnode.attrs.id}`,
            'oncreate': m.route.link
        }, vnode.attrs.title);

        return m('li', link);
    }
};

const Entries = {
    list: [],

    load: (feedId) => {
        console.log('loading entries');
        return m.request({
            method: 'GET',
            url: '/feed/' + feedId,
            withCredentials: true
        }).then((data) => {
            Entries.list = data;
        });
    }
};

const EntryList = {
    oninit: function (vnode) {
        console.log('entry list init');
        Entries.load(vnode.attrs.key);
    },

    view: function (vnode) {
        return m('ul#entry-list', Entries.list.map(function (entry) {
            return m(EntryListItem, entry);
        }));
    }
};

const EntryListItem = {
    view: function (vnode) {
        const linkAttrs = {
            'href': vnode.attrs.url,
            'target': '_blank',
            'rel': 'external noopener noreferrer'
        };

        return m('li', [
            m('a', linkAttrs, vnode.attrs.title),
            m(DiscussionList, { discussions: vnode.attrs.discussions})
        ]);
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


const HomeView = {
    view: function () {
        return [
            m(SubscriptionList)
        ];
    }
};

const FeedView = {
    view: function (vnode) {
        return [
            m(SubscriptionList),
            m(EntryList, vnode.attrs)
        ];
    }
};

m.route(document.body, '/', {
    '/': HomeView,
    '/feed/:key': {
        render: (vnode) => {
            return m(FeedView, vnode.attrs);
        }
    }
});
