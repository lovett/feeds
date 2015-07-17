var normalize = require('../../util/normalize');
var assert = require('assert');

describe('util/normalize.js', function () {
    describe('url()', function () {
        it('lowercases input ', function () {
            var input, result;
            input = 'example.com'.toUpperCase();
            result = normalize.url(input);
            assert.strictEqual(result, input.toLowerCase());
        });

        it('removes the scheme', function () {
            var input, result;
            input = 'http://example.com';
            result = normalize.url(input);
            assert.strictEqual(result, 'example.com');

            input = 'https://example.com';
            result = normalize.url(input);
            assert.strictEqual(result, 'example.com');

            input = 'feed://example.com';
            result = normalize.url(input);
            assert.strictEqual(result, 'example.com');
        });

        it('removes www', function () {
            var input, result;
            input = 'http://www.example.com';
            result = normalize.url(input);
            assert.strictEqual(result, 'example.com');

            input = 'http://www.example.com/www.';
            result = normalize.url(input);
            assert.strictEqual(result, 'example.com/www.');
        });

        it('removes the anchor', function () {
            var input, result;
            input = 'http://example.com/#anchor';
            result = normalize.url(input);
            assert.strictEqual(result, 'example.com');

            input = 'http://example.com/%23encoded';
            result = normalize.url(input);
            assert.strictEqual(result, 'example.com');
        });

        it('preserves the querystring', function () {
            var input, result;
            input = 'http://example.com/?test';
            result = normalize.url(input);
            assert.strictEqual(result, 'example.com/?test');
        });

        it('removes the trailing slash', function () {
            var input, result;
            input = 'http://example.com/';
            result = normalize.url(input);
            assert.strictEqual(result, 'example.com');
        });

        it('performs decoding', function () {
            var input, result;
            input = 'http%3A%2F%2Fexample.com';
            result = normalize.url(input);
            assert.strictEqual(result, 'example.com');
        });
    });
});
