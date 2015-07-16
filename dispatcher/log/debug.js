module.exports = function (message, fields) {
    this.emit('log', 'debug', message, fields);
};
