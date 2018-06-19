var assert, dispatcher, events, fs, os, path, sinon;

assert = require('assert');
events = require('events');
fs = require('fs');
path = require('path');
dispatcher = require('../../dispatcher');
sinon = require('sinon');
os = require('os');

describe('index', function() {
    'use strict';

    beforeEach(function () {
        this.fixturePath = path.join(process.cwd(), 'test', 'dispatcher', 'fixtures');
    });

    it('should export an object that inherits from EventEmitter', function () {
        assert(dispatcher instanceof events.EventEmitter);
    });

});
