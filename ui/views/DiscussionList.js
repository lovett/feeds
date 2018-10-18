const DiscussionList = {
    view: function (vnode) {
        return m('ul.discussions', vnode.attrs.discussions.map(function (discussion) {
            return m(DiscussionListItem, discussion);
        }));
    }
};
