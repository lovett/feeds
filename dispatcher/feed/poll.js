'use strict';

let timer = null;
const timerMinutes = 10;

/**
 * Repeatedly check the database for the next feed to be fetched.
 *
 * Feeds are fetched one-at-a-time in order to spread the work out.
 */
module.exports = function () {

    const self = this;

    self.db.get('SELECT id, url FROM nextFeedToFetchView', [], (err, row) => {

        if (err) {
            self.emit('log:error', 'Failed to query nextFeedToFetchView', err.message);
            self.emit('poll:done');
            return;
        }

        if (!row) {
            self.emit('log:info', 'Nothing to fetch at this time.');
            self.emit('poll:done');
            return;
        }

        self.emit('feed:reschedule', row.id);

        self.emit('fetch', row.id, row.url);
        self.emit('poll:done');
    });

    if (!timer) {
        self.emit('log:debug', `Polling every ${timerMinutes} minutes.`);
        timer = setInterval(() => {
            emitter.emit('feed:poll');
        }, timerMinutes * 60 * 1000);
    };
};
