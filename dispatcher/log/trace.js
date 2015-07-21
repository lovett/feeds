module.exports = function (message, fields) {
    'use strict';

    this.emit('log', 'trace', message, fields);
};
