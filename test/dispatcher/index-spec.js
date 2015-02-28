var assert = require('assert');
var events = require('events');
var path = require('path');
var dispatcher = require('../../dispatcher');
var sinon = require('sinon');

describe('index.js', function() {
    beforeEach(function () {
        this.fixturePath = path.join(process.cwd(), 'test', 'dispatcher', 'fixtures');        
    });
    
    it('should export an object that inherits from EventEmitter', function () {
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
        beforeEach(function () {
            this.autoloadFixture = path.join(this.fixturePath, 'autoload');
            sinon.stub(dispatcher, 'load');
        });

        afterEach(function () {
            dispatcher.load.restore();
        });

        it('calls load for every js file found', function (done) {
            dispatcher.autoload(this.autoloadFixture);

            var interval = setInterval(function () {
                if (dispatcher.load.callCount === 4) {
                    clearInterval(interval);
                    done();
                }
            });
        });
    });

    describe('load()', function () {
        beforeEach(function () {
            sinon.stub(dispatcher, 'on');
        });

        afterEach(function () {
            dispatcher.on.restore();
        });

        it('registers a listener when a module exports a function', function () {
            var loadPath = path.join(this.fixturePath, 'autoload', 'subdir', 'subdir2', 'deep.js');
            dispatcher.load(loadPath, this.fixturePath);
            sinon.assert.calledWith(dispatcher.on, 'autoload:subdir:subdir2:deep');
        });

        it('rolls up index files when determining the event name', function () {
            var loadPath = path.join(this.fixturePath, 'autoload', 'index.js');
            dispatcher.load(loadPath, this.fixturePath);
            sinon.assert.calledWith(dispatcher.on, 'autoload');
        });
        
        it('ignores a module if it does not export a function', function () {
            var loadPath = path.join(this.fixturePath, 'autoload', 'object.js');
            dispatcher.load(loadPath, this.fixturePath);
            sinon.assert.notCalled(dispatcher.on);
        });
    });
    
})
