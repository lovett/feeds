module.exports = function (event, listener) {
    if (this._loggedEvents.hasOwnProperty(event) === false) {
        return;
    }

    this.removeListener(event, this._loggedEvents[event]);
    delete this._loggedEvents[event];
};
