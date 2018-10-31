module.exports = function (event, listener) {
    if (event === 'removeListener') {
        return;
    }

    if (this._loggedEvents.hasOwnProperty(event)) {
        return;
    }

    const logWriter = function () {
        let argsList = [].slice.call(arguments);
        this.emit('log', 'info', {
            event,
            arguments: argsList
        });
    };

    this._loggedEvents[event] = logWriter;

    this.on(event, logWriter);
};
