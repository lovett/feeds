module.exports = function (args) {
    this.emit('log:write', [].concat('info', args));
};
