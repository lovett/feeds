var assert = require('assert');
var events = require('events');
var dispatcher = require('../../dispatcher');
var sinon = require('sinon');


describe('index.js', function() {
    it('should export a object that inherits from EventEmitter', function () {
        assert(dispatcher instanceof events.EventEmitter);
    });
    
    it('should expose an insist method', function () {
        assert.strictEqual(typeof dispatcher.insist, 'function');
    });

    it('should expose an autoload method', function () {
        assert.strictEqual(typeof dispatcher.autoload, 'function');
    });

    it('should expose a load method', function () {
        assert.strictEqual(typeof dispatcher.autoload, 'function');
    });

    describe('insist()', function () {
    });

    describe('autoload()', function () {
    });

    describe('load()', function () {
    });
    
})
