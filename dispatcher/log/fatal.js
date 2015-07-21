module.exports = function (message, fields) {
    'use strict';

    this.emit('log', 'fatal', message, fields);
};
