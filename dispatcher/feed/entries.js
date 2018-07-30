'use strict';

module.exports = function (feedId, userId, callback = () => {}) {
    const self = this;
    callback = (typeof callback === 'function') ? callback : function() {};

    self.db.all(
        `SELECT e.id, e.url, e.title, e.author, e.created, e.body, e.extras
         FROM userEntries ue, entries e ON ue.entryId=e.id
         WHERE ue.userId=?
         AND ue.feedId=?
         AND ue.read=0
         ORDER BY e.created DESC`,
        [userId, feedId],
        (err, rows) => {
            if (err) {
                self.emit('log:error', `Failed to select entries: ${err.message}`);
            }

            callback(err, rows);
        }
    );
};
