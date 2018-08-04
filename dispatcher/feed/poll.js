/** @module feed/poll */
'use strict';

const timerMinutes = 10;

/**
 * Callback for the feed-poll event.
 *
 * @callback feedWatchCallback
 * @param {error} [err] - Database error.
 * @param {Number} [feedId] - The unique identifier of the feed being fetched.
 *
 */

/**
 * Repeatedly check the database for the next feed to be fetched.
 *
 * Feeds are fetched one-at-a-time in order to spread the work out.
 *
 * @param {pollCallback} callback - A function to invoke on success or failure.
 * @event feed-poll
 * @fires feed:reschedule
 * @fires feed-poll
 */
module.exports = function (callback = () => {}) {
    const self = this;

    self.db.get('SELECT id, url FROM nextFeedToFetchView', [], (err, row) => {
        if (err) {
            callback(err);
            return;
        }

        if (!row) {
            callback(null, null);
            return;
        }

        self.emit('fetch', row.id, row.url);

        // The feed is rescheduled regardless of the outcome of the
        // fetch.
        self.emit('feed:reschedule', row.id);

        callback(null, row.id);
    });

    if (!self.pollingTimer) {
        self.pollingTimer = setInterval(() => {
            self.emit('feed-poll', callback);
        }, timerMinutes * 60 * 1000);
    }
};
