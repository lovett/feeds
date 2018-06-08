module.exports = function (event, listener) {
    const emitter = this;

    if (event === 'removeListener') {
        return;
    }

    if (this._loggedEvents.hasOwnProperty(event)) {
        return;
    }

    const logWriter = (args) => {
        emitter.emit('log:info', [event, args]);
    };

    this._loggedEvents[event] = logWriter;

    this.on(event, logWriter);
};
