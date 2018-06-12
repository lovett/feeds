const assert = require('assert');
const normalize = require('../../util/normalize');

describe('util/normalize', function () {
    'use strict';

    describe('url()', function () {
        it('lowercases input ', function () {
            let input = 'eXaMpLe.cOm';
            let result = normalize.url(input);
            assert.strictEqual(result, input.toLowerCase());
        });

        it('removes the scheme', function () {
            let input = 'http://example.com';
            let result = normalize.url(input);
            assert.strictEqual(result, 'example.com');

            input = 'https://example.com';
            result = normalize.url(input);
            assert.strictEqual(result, 'example.com');

            input = 'feed://example.com';
            result = normalize.url(input);
            assert.strictEqual(result, 'example.com');
        });

        it('removes www', function () {
            let input = 'http://www.example.com';
            let result = normalize.url(input);
            assert.strictEqual(result, 'example.com');

            input = 'http://www.example.com/www.';
            result = normalize.url(input);
            assert.strictEqual(result, 'example.com/www.');
        });

        it('removes the anchor', function () {
            let input = 'http://example.com/#anchor';
            let result = normalize.url(input);
            assert.strictEqual(result, 'example.com');

            input = 'http://example.com/%23encoded';
            result = normalize.url(input);
            assert.strictEqual(result, 'example.com');
        });

        it('preserves the querystring', function () {
            let input = 'http://example.com/?id=1';
            let result = normalize.url(input);
            assert.strictEqual(result, 'example.com/?id=1');
        });

        it('removes bare querystring variables', function () {
            let input = 'http://example.com/?test';
            let result = normalize.url(input);
            assert.strictEqual(result, 'example.com');
        });

        it('removes the trailing slash', function () {
            let input = 'http://example.com/';
            let result = normalize.url(input);
            assert.strictEqual(result, 'example.com');
        });

        it('performs decoding', function () {
            let input = 'http%3A%2F%2Fexample.com';
            let result = normalize.url(input);
            assert.strictEqual(result, 'example.com');
        });

        it('removes multiple utm_ querystring parameters', function () {
            let input = 'http://example.com/?utm_campaign=example&utm_medium=whatever&utm_source=something';
            let result = normalize.url(input);
            assert.strictEqual(result, 'example.com');
        });

        it('removes single utm_ querystring parameter', function () {
            let input = 'http://example.com/?utm_whatever=example';
            let result = normalize.url(input);
            assert.strictEqual(result, 'example.com');
        });
    });
});
