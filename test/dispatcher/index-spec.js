var assert, dispatcher, events, fs, os, path, sinon;

assert = require('assert');
events = require('events');
fs = require('fs');
path = require('path');
dispatcher = require('../../dispatcher');
sinon = require('sinon');
os = require('os');

// Temporarily inactive pending refactoring.
xdescribe('index', function() {
    'use strict';

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
            this.clock = sinon.useFakeTimers();
        });

        afterEach(function () {
            dispatcher.removeAllListeners();
            this.clock.restore();
        });

        it('should emit when a listener is available', function (done) {
            dispatcher.on('test', function (arg1, arg2) {
                assert.strictEqual(arg1, 'arg1');
                assert.strictEqual(arg2, 'arg2');
                done();
            });
            dispatcher.insist('test', 'arg1', 'arg2');
            this.clock.tick(10);
        });

        it('should eventually give up', function (done) {
            var event = 'test';
            dispatcher.on('insist:failure', function (failedEvent) {
                assert.strictEqual(event, failedEvent);
                done();
            });
            dispatcher.insist('test', 'arg1', 'arg2');
            this.clock.tick(500);
        });

        it('should emit if a listener is eventually available', function (done) {
            dispatcher.on('test', function () {
                done();
            });
            this.clock.tick(10);
            dispatcher.insist('test');
            this.clock.tick(10);
        });

        it('should require an event argument', function () {
            var result = dispatcher.insist();
            assert.strictEqual(result, false);
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
            var interval;

            dispatcher.autoload(this.autoloadFixture);

            interval = setInterval(function () {
                if (dispatcher.load.callCount === 4) {
                    clearInterval(interval);
                    done();
                }
            });
        });

        it('loads from script directory by default', function (done) {
            var interval;

            dispatcher.autoload();

            interval = setInterval(function () {
                if (dispatcher.load.callCount > 0) {
                    clearInterval(interval);
                    done();
                }
            });
        });

        it('handles failure to read directories', function (done) {
            var dirPath;

            dirPath = path.join(os.tmpdir(), 'non-existant');

            dispatcher.once('log:error', function () {
                done();
            });

            dispatcher.autoload(dirPath);

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

        it('defaults to script directory', function () {
            var loadPath = path.join(__dirname, '..', '..', 'dispatcher', 'poll.js');
            dispatcher.load(loadPath);
            sinon.assert.called(dispatcher.on);
        });
    });

    describe('unlisten()', function () {
        beforeEach(function () {
            dispatcher.on('test', function () {
                return true;
            });
        });

        afterEach(function () {
            dispatcher.removeAllListeners();
        });

        it('removes the callback for the specified event', function (done) {
            var loadPath;
            loadPath = path.join(__dirname, '..', '..', 'dispatcher', 'test.js');

            dispatcher.once('unlisten:done', function (params) {
                assert.strictEqual(params.event, 'test');
                assert.strictEqual(dispatcher.listeners('test').length, 0);
                done();
            });
            dispatcher.unlisten(loadPath);
        });
    });
});
