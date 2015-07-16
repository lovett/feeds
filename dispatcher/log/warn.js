module.exports = function (message, fields) {
    this.emit('log', 'warn', message, fields);
};
