'use strict';

module.exports = function (userId, callback) {
    callback = (typeof callback === 'function') ? callback : function() {};

    const emitter = this;

    emitter.db.all(
        `SELECT coalesce(u.title, f.title) as title, f.id, f.url, f.siteUrl,
         count(ue.entryId) as entryCount,
         CAST(strftime('%s', f.created) AS INTEGER) as created,
         CAST(strftime('%s', f.nextFetch) AS INTEGER) as nextFetch
         FROM userFeeds u JOIN feeds f ON u.feedId=f.id
         LEFT JOIN userEntries ue ON u.feedId=ue.feedId AND ue.read=0
         WHERE u.userId=?
         GROUP BY u.feedId
         `,
        [userId],
        (err, rows) => {
            callback(err, rows);
        }
    );
};
