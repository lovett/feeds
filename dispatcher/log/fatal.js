module.exports = function (args) {
    this.emit('log:write', [].concat('fatal', args));
};
