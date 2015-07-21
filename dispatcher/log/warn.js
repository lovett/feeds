module.exports = function (message, fields) {
    'use strict';

    this.emit('log', 'warn', message, fields);
};
