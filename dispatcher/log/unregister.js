/** @module log/unregister */

/**
 * Internal event used to clean up logging listeners on removed events.
 *
 * @param {String|Symbol} event - The event name.
 * @param {Function} listener - The event handler function.
 * @event removeListener
 */
module.exports = function (event, listener) {
    if (this._loggedEvents.hasOwnProperty(event) === false) {
        return;
    }

    this.removeListener(event, this._loggedEvents[event]);
    delete this._loggedEvents[event];
};
