'use strict';

let timer = null;
const timerMinutes = 10;

/**
 * Repeatedly check the database for the next feed to be fetched.
 *
 * Feeds are fetched one-at-a-time in order to spread the work out.
 */
module.exports = function (once = false, callback = () => {}) {

    const self = this;

    self.db.get('SELECT id, url FROM nextFeedToFetchView', [], (err, row) => {

        if (err) {
            self.emit('log:error', 'Failed to query nextFeedToFetchView', err.message);
            callback(err);
            return;
        }

        if (!row) {
            self.emit('log:info', 'Nothing to fetch at this time.');
            callback();
            return;
        }

        self.emit('feed:reschedule', row.id);

        self.emit('fetch', row.id, row.url);
        callback(null, row.id);
    });

    if (!timer && !once) {
        self.emit('log:debug', `Polling every ${timerMinutes} minutes.`);
        timer = setInterval(() => {
            self.emit('feed:poll');
        }, timerMinutes * 60 * 1000);
    };
};
