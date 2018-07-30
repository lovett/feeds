'use strict';

module.exports = function (userId, subscriptions, callback = () => {}) {
    callback = (typeof callback === 'function') ? callback : function() {};

    const emitter = this;
    let counter = 0;

    if (subscriptions.hasOwnProperty('urls') === false) {
        subscriptions.urls = [];
    }

    if (subscriptions.hasOwnProperty('ids') === false) {
        subscriptions.ids = [];
    }

    emitter.db.serialize(() => {
        emitter.db.run('BEGIN');

        subscriptions.urls.forEach((url) => {
            emitter.db.run(
                'DELETE FROM userFeeds WHERE userId=? AND feedId=(SELECT id FROM feeds WHERE url=?)',
                [userId, url],
                function () {
                    counter += this.changes;
                }
            );
        });

        subscriptions.ids.forEach((id) => {
            emitter.db.run(
                'DELETE FROM userFeeds WHERE userId=? AND feedId=?',
                [userId, id],
                function () {
                    counter += this.changes;
                }
            );
        });

        emitter.db.run('COMMIT', [], (err) => {
            callback(err, {
                unwatchCount: counter
            });
        });
    });
};
