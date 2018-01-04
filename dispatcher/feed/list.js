'use strict';

module.exports = function (userId, callback) {
    callback = (typeof callback === 'function') ? callback : function() {};

    const emitter = this;

    emitter.db.all(
        'SELECT coalesce(u.title, f.title) as title, f.id, f.url, f.siteUrl FROM userFeeds u JOIN feeds f ON u.feedId=f.id WHERE u.userId=?',
        [userId],
        (err, rows) => {
            emitter.emit('feed:list:done', userId, rows);
            callback(err, rows);
        }
    );
};
