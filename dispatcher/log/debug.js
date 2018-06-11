/**
 * Log a debug message as a list.
 *
 * Uses console.log() because console.debug() is an alias method.
 */
module.exports = function () {
    let message = [].slice.call(arguments);
    message.unshift('log:debug');
    console.log(message);
};
