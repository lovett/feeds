module.exports = function (event, listener) {
    if (event === 'removeListener') {
        return;
    }

    if (this._loggedEvents.hasOwnProperty(event)) {
        return;
    }

    const logWriter = (args) => {
        let message = [`event:${event}`];
        if (args) {
            message.push(args);
        }
        console.log(message);
    };

    this._loggedEvents[event] = logWriter;

    this.on(event, logWriter);
};
