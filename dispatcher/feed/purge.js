'use strict';

module.exports = function (feeds, callback) {
    callback = (typeof callback === 'function') ? callback : function() {};

    const emitter = this;
    let counter = 0;

    if (feeds.hasOwnProperty('urls') === false) {
        feeds.urls = [];
    }

    if (feeds.hasOwnProperty('ids') === false) {
        feeds.ids = [];
    }

    emitter.db.serialize(() => {
        emitter.db.run('BEGIN');

        feeds.urls.forEach((url) => {
            emitter.db.run(
                'DELETE FROM feeds WHERE url=?',
                [url],
                function () {
                    counter += this.changes;
                }
            );
        });

        feeds.ids.forEach((id) => {
            emitter.db.run(
                'DELETE FROM feeds WHERE id=?',
                [id],
                function () {
                    counter += this.changes;
                }
            );
        });

        emitter.db.run('COMMIT', [], (err) => {
            callback(err, {
                deletionCount: counter
            });
        });
    });
};
