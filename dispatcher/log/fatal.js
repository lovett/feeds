module.exports = function (message, fields) {
    this.emit('log', 'fatal', message, fields);
};
