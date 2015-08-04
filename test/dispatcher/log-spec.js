var assert, events, logDebug, logError, logFatal, logInfo, logTrace, logWarn;

logFatal = require('../../dispatcher/log/fatal');
logError = require('../../dispatcher/log/error');
logWarn = require('../../dispatcher/log/warn');
logInfo = require('../../dispatcher/log/info');
logDebug = require('../../dispatcher/log/debug');
logTrace = require('../../dispatcher/log/trace');
assert = require('assert');
events = require('events');

describe('log', function() {
    'use strict';

    beforeEach(function () {
        this.emitter = new events.EventEmitter();
        this.message = 'message';
        this.fields = {foo: 'bar'};
    });

    afterEach(function () {
        this.emitter.removeAllListeners();
    });

    it('re-emits fatal logs to the primary handler', function (done) {
        var event, level, self;
        self = this;
        level = 'fatal';
        event = 'log:' + level;

        self.emitter.on(event, logFatal);

        self.emitter.on('log', function (logLevel, logMessage, logFields) {
            assert.strictEqual(level, logLevel);
            assert.strictEqual(self.message, logMessage);
            assert.strictEqual(self.fields, logFields);
            done();
        });
        self.emitter.emit(event, this.message, this.fields);
    });

    it('re-emits error logs to the primary handler', function (done) {
        var event, level, self;
        self = this;
        level = 'error';
        event = 'log:' + level;

        self.emitter.on(event, logError);

        self.emitter.on('log', function (logLevel, logMessage, logFields) {
            assert.strictEqual(level, logLevel);
            assert.strictEqual(self.message, logMessage);
            assert.strictEqual(self.fields, logFields);
            done();
        });
        self.emitter.emit(event, this.message, this.fields);
    });

    it('re-emits warn logs to the primary handler', function (done) {
        var event, level, self;
        self = this;
        level = 'warn';
        event = 'log:' + level;

        self.emitter.on(event, logWarn);

        self.emitter.on('log', function (logLevel, logMessage, logFields) {
            assert.strictEqual(level, logLevel);
            assert.strictEqual(self.message, logMessage);
            assert.strictEqual(self.fields, logFields);
            done();
        });
        self.emitter.emit(event, this.message, this.fields);
    });

    it('re-emits info logs to the primary handler', function (done) {
        var event, level, self;
        self = this;
        level = 'info';
        event = 'log:' + level;

        self.emitter.on(event, logInfo);

        self.emitter.on('log', function (logLevel, logMessage, logFields) {
            assert.strictEqual(level, logLevel);
            assert.strictEqual(self.message, logMessage);
            assert.strictEqual(self.fields, logFields);
            done();
        });
        self.emitter.emit(event, this.message, this.fields);
    });

    it('re-emits debug logs to the primary handler', function (done) {
        var event, level, self;
        self = this;
        level = 'debug';
        event = 'log:' + level;

        self.emitter.on(event, logDebug);

        self.emitter.on('log', function (logLevel, logMessage, logFields) {
            assert.strictEqual(level, logLevel);
            assert.strictEqual(self.message, logMessage);
            assert.strictEqual(self.fields, logFields);
            done();
        });
        self.emitter.emit(event, this.message, this.fields);
    });

    it('re-emits trace logs to the primary handler', function (done) {
        var event, level, self;
        self = this;
        level = 'trace';
        event = 'log:' + level;

        self.emitter.on(event, logTrace);

        self.emitter.on('log', function (logLevel, logMessage, logFields) {
            assert.strictEqual(level, logLevel);
            assert.strictEqual(self.message, logMessage);
            assert.strictEqual(self.fields, logFields);
            done();
        });
        self.emitter.emit(event, this.message, this.fields);
    });

});
