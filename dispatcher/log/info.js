module.exports = function (message, fields) {
    'use strict';

    this.emit('log', 'info', message, fields);
};
