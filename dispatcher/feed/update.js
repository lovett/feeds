module.exports = function (db, fields) {
    'use strict';

    var self = this;

    if (fields.hasOwnProperty('url')) {
        db.run('UPDATE feeds SET url=? WHERE id=?', [fields.url, fields.id], function (err) {
            if (err) {
                self.emit('log:error', 'Failed to update feed', {error: err, fields: fields});
            }
            self.emit('feed:update:done', fields);
        });
    }
};
