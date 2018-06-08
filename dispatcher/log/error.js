module.exports = function (args) {
    this.emit('log:write', [].concat('error', args));
};
