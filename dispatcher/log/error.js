module.exports = function (message, fields) {
    this.emit('log', 'error', message, fields);
};
