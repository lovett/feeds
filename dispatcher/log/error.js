module.exports = function (message, fields) {
    'use strict';

    this.emit('log', 'error', message, fields);
};
