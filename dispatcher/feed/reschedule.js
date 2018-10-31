'use strict';

/**
 * Advance a feed's nextFetch field by 1 hour.
 */
module.exports = function (feedId, hours, callback = () => {}) {
    const self = this;

    hours = parseInt(hours, 10);

    if (!hours || hours < 1) {
        hours = 1;
    }

    self.db.get(
        `UPDATE feeds SET nextFetch=datetime("now", "+${hours} hour") WHERE id=?`,
        [feedId],
        (err) => {
            if (err) {
                self.emit('log-error', `Failed to reschedule feed: ${err.message}`);
                feedId = null;
            }

            callback(err, feedId);
        }
    );
};
