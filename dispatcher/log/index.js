/** @module log */
'use strict';

/**
 * Log a message to the console.
 *
 * The structure of the message object is free-form. The log level and
 * current time will be automatically added using the keys level and
 * timestamp, respectively.
 *
 * Calling this listener directly is usually less preferable than
 * using one of the level-specific aliases (log-info, log-error,
 * etc). They make it more convenient to log strings.
 *
 * @param {String} level - One of the standard log levels (debug, warn, info, error). Or a custom value.
 * @param {Object} message - Arbitrary keys and values of interest.
 * @event log
 */
module.exports = function (level, message) {
    const timestampedMessage = Object.assign(message, {
        timestamp: new Date(),
        level,
    });

    console.log(JSON.stringify(timestampedMessage));
};
