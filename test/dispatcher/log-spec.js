var logFatal = require('../../dispatcher/log/fatal');
var logError = require('../../dispatcher/log/error');
var logWarn = require('../../dispatcher/log/warn');
var logInfo = require('../../dispatcher/log/info');
var logDebug = require('../../dispatcher/log/debug');
var logTrace = require('../../dispatcher/log/trace');

var assert = require('assert');
var events = require('events');

describe('log handler', function() {
    beforeEach(function () {
        this.emitter = new events.EventEmitter();
        this.message = 'message';
        this.fields = {foo: 'bar'};
    });

    afterEach(function () {
        this.emitter.removeAllListeners();
    });

    it('re-emits fatal logs to the primary handler', function (done) {
        var self, level, event;
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
        var self, level, event;
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
        var self, level, event;
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
        var self, level, event;
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
        var self, level, event;
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
        var self, level, event;
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
