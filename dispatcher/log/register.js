module.exports = function (event, listener) {
    if (event === 'removeListener') {
        return;
    }

    if (this._loggedEvents.hasOwnProperty(event)) {
        return;
    }

    const logWriter = function () {
        let argumentList = [].slice.call(arguments);
        let message = [`event:${event}`].concat(argumentList);
        console.log(message);
    };

    this._loggedEvents[event] = logWriter;

    this.on(event, logWriter);
};
