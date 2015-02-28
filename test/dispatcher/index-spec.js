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
        beforeEach(function () {
            dispatcher.retryMs = 1;
            this.spy = sinon.spy();
            this.clock = sinon.useFakeTimers();
            sinon.spy(dispatcher, 'emit');
        });

        afterEach(function () {
            dispatcher.removeAllListeners();
            this.clock.restore();
            dispatcher.emit.restore();
        });

        it('should emit when a listener is available', function () {
            dispatcher.on('test', this.spy);
            dispatcher.insist('test', ['arg1', 'arg2', this.spy]);
            sinon.assert.calledWith(dispatcher.emit, 'test');
            sinon.assert.calledWith(this.spy, 'arg1', 'arg2');
        });

        it('should eventually give up', function () {
            dispatcher.insist('test', ['arg1', 'arg2', this.spy]);
            this.clock.tick(500);
            sinon.assert.notCalled(this.spy);
            sinon.assert.calledWith(dispatcher.emit, 'log:fatal');
        });

        it('should emit if a listener is subsequently added', function () {
            dispatcher.insist('test', ['arg1', 'arg2', this.spy]);
            this.clock.tick(1);
            dispatcher.on('test', this.spy);
            this.clock.tick(1);
            sinon.assert.calledWith(this.spy, 'arg1', 'arg2');
        });

        it('should require an event argument', function () {
            var result = dispatcher.insist();
            assert.strictEqual(result, false);
        });

        it('should provide a default value for args', function () {
            dispatcher.on('test', this.spy);
            dispatcher.insist('test');
            sinon.assert.calledOnce(this.spy);
        });
        
    });

    describe('autoload()', function () {
    });

    describe('load()', function () {
    });
    
})
