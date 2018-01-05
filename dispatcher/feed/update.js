'use strict';

module.exports = function (feeds, callback) {
    callback = (typeof callback === 'function') ? callback : function() {};

    const emitter = this;

    const updatableFields = ['url', 'title', 'siteUrl'];

    let updateCounter = 0;

    emitter.db.serialize(() => {
        emitter.db.run('BEGIN');

        feeds.forEach((feed) => {
            updatableFields.forEach((field) => {
                if (feed.hasOwnProperty(field) === false) {
                    return;
                }

                emitter.db.run(
                    `UPDATE feeds SET ${field}=? WHERE id=?`,
                    [feed[field], feed.id],
                    function () {
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
