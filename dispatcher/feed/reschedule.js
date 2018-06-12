'use strict';

/**
 * Advance a feed's nextFetch field by 1 hour.
 */
module.exports = function (feedId) {
    const self = this;

    self.db.get(
        'UPDATE feeds SET nextFetch=datetime("now", "+1 hour") WHERE id=?',
        [feedId],
        function (err) {
            if (err) {
                self.emit('log:error', `Failed to reschedule feed: ${err.message}`);
                return;
            }

            self.emit('feed:reschedule:done', feedId);
        }
    );
};
