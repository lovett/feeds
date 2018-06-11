/**
 * Log an error message as a list.
 *
 * Substitution values are not handled.
 */
module.exports = function () {
    let message = [].slice.call(arguments);
    message.unshift('log:error');
    console.error(message);
};
