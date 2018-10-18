'use strict';
const timedelta = require('../../ui/timedelta');
const assert = require('assert');

describe('timedelta', function() {
    it('defaults to the current date', function () {
        const step = 1;
        const seconds = Date.now()/1000 - step;
        const result = timedelta(seconds);
        assert.deepEqual(
            result,
            [[step, 'second']]
        );
    });

    it('treats null start date the same as undefined', function () {
        const step = 2;
        const seconds = Date.now()/1000 - step;
        const result = timedelta(seconds, null);
        assert.deepEqual(
            result,
            [[step, 'second']]
        );
    });

    it('omits intervals unnecessary intervals', function () {
        const seconds = 61;
        const start = 0;
        const result = timedelta(seconds, start);
        assert.deepEqual(
            result,
            [[1, 'minute'], [1, 'second']]
        );
    });
});
