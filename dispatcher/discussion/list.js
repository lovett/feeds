'use strict';

module.exports = function (entryIds=[], callback) {
    const self = this;

    if (entryIds.length === 0) {
        return [];
    }

    let placeholders = entryIds.reduce((accumulator) => {
        accumulator += ',?';
        return accumulator;
    }, '').substr(1);

    self.db.all(
        `SELECT entryId, label, url, commentCount
         FROM discussions
         WHERE entryId IN (${placeholders})`,
        entryIds,
        (err, rows) => {
            callback(err, rows);
        }
    );
};
