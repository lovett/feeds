'use strict';

module.exports = function (userId, feeds, callback) {
    callback = (typeof callback === 'function') ? callback : function() {};

    const emitter = this;

    const updatableFields = ['title'];

    let updateCounter = 0;

    emitter.db.serialize(() => {
        emitter.db.run('BEGIN');

        feeds.forEach((feed) => {
            updatableFields.forEach((field) => {
                if (feed.hasOwnProperty(field) === false) {
                    return;
                }

                emitter.db.run(
                    `UPDATE userFeeds SET ${field}=? WHERE userId=? AND feedId=?`,
                    [feed[field], userId, feed.feedId],
                    function (err) {
                        updateCounter += this.changes;
                    }
                );
            });
        });

        emitter.db.run('COMMIT', [], (err) => {
            callback(err, {
                fieldsUpdated: updateCounter
            });
        });

    });
};
