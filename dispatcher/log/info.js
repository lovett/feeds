module.exports = function (message, fields) {
    this.emit('log', 'info', message, fields);
};
