const logError = require('../../dispatcher/log/error');
const logWarn = require('../../dispatcher/log/warn');
const logInfo = require('../../dispatcher/log/info');
const logDebug = require('../../dispatcher/log/debug');
const assert = require('assert');
const events = require('events');

// Temporarily inactive pending refactoring.
xdescribe('log', function() {
    'use strict';

    beforeEach(function () {
        this.emitter = new events.EventEmitter();
        this.message = 'message';
        this.fields = {foo: 'bar'};
    });

    afterEach(function () {
        this.emitter.removeAllListeners();
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
});
