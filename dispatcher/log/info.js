/**
 * Log an info message as a list.
 *
 * Uses console.log() because console.info() is an alias method.
 */
module.exports = function () {
    let message = [].slice.call(arguments);
    message.unshift('log:info');
    console.log(message);
};
