module.exports = {
    // A counter that provides numeric user ids. It is incremented during user signup.
    userIdCounter: "user:count",

    // A sorted set of how many users are subscribed to each feed
    // The set memeber is a feed id. The score is the number of
    // subscribers.
    feedSubscriptionsKey: "feeds:subscriptions",

    // If a userId is specified, a hash of user-specific feed
    // metadata (such as the feed name). If not, a hash of
    // user-agnostic feed metadata (such as its url).
    feedKey: function (feedId, userId) {
        var value = 'feed:' + feedId;
        if (userId) {
            value += ':user:' + userId;
        }
        return value;
    },

    // A set of user ids that are subscribed to a feed
    feedSubscribersKey: function (feedId) {
        return 'feed:' + feedId + ':users';
    },

    // A set of feed ids that a user is subscribed to
    feedListKey: function(userId) {
        return "user:" + userId + ':feeds';
    },
    
    // A sorted set of next-check timestamps for each subscribed
    // feed. The set memeber is a feed id. The score is a unix
    // timestamp indicating when the feed should next be fetched.
    feedQueueKey: 'feeds:queue',

    // A hash of entry metadata. The entry id is a hash derived
    // from its url.
    entryKey: function (entryId) {
        return 'entry:' + entryId;
    },

    // A sorted set associating feeds to entries.  The set member
    // is a feed id. The score is a timestamp indicating when the
    // entry was added. The set member is a feed id.
    feedEntriesKey: function (feedId) {
        return 'feed:' + feedId + ':entries';
    },

    // A list of feed ids that have not yet been read by a user.
    unreadKey: function (userId) {
        return 'user:' + userId + ':unread';
    },

    // A list of feed ids that a user has saved
    savedKey: function (userId) {
        return 'user:' + userId + ':saved';
    },

    // A string containing the id and password for a user
    userKey: function (username) {
        return 'user:' + username;
    },

    // A string mapping a token to a user id
    userTokenKey: function (token) {
        return 'token:' + token;
    }

}
