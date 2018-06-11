/**
 * Log a warning message.
 *
 * Uses console.error() because console.warn() is an alias method.
 *
 * Substitution values are not handled.
 */
module.exports = function () {
    const message = [].slice.call(arguments);
    message.unshift('log:warn');
    console.error(message);
};
