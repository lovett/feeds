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
