module.exports = function (message, fields) {
    'use strict';

    this.emit('log', 'debug', message, fields);
};
