module.exports = function (message, fields) {
    this.emit('log', 'trace', message, fields);
};
