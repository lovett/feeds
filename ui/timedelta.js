'use strict';

/**
 * Calculate the delta between two unix timestamps as a human-readable
 * string.
 *
 * @param {Number} seconds - A unix timestamp.
 * @param {Number} start - The point of reference as a Unix timestamp.
 * @return {string}
 */
module.exports = function (seconds, start) {
    if (start === undefined || start === null) {
        start = Date.now()/1000;
    }

    const delta = Math.abs(start - seconds);

    // Intervals should be in descending order.
    const intervals = [
        [60 * 60 * 60 * 365, 'year'],
        [60 * 60 * 60 * 30, 'month'],
        [60 * 60 * 60 * 7, 'week'],
        [60 * 60 * 24, 'day'],
        [60 * 60, 'hour'],
        [60, 'minute'],
        [1, 'second']
    ];

    return intervals.reduce((accumulator, interval) => {
        const remaining = accumulator[0];
        const intervalSeconds = interval[0];
        const intervalUnit = interval[1];
        const intervalAmount = Math.floor(remaining / intervalSeconds);
        const remainder = remaining % intervalSeconds;

        accumulator[0] = remainder;

        if (intervalAmount > 0) {
            accumulator[1].push([intervalAmount, intervalUnit]);
        }

        return accumulator;
    }, [delta, []]).pop();
};
