/** @module log/register */

/**
 * Internal event used to capture event registration for logging purposes.
 *
 * @param {String|Symbol} event - The name of the event being listened for.
 * @param {Function} listener - The event handler function.
 * @event newListener
 */
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
