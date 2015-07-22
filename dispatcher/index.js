var emitter, events, fs, path;

events = require('events');
emitter = new events.EventEmitter();
fs = require('fs');
path = require('path');

// How long to wait between retries
emitter.retryMs = 10;

// How many retries to make
emitter.maxRetries = 10;

/**
 * Emit an event repeatedly until a listener is available
 */
emitter.insist = function (event, args, retries) {
    'use strict';

    if (!event) {
        return false;
    }


    if (args === undefined) {
        args = [];
    }

    if (retries === undefined) {
        retries = emitter.maxRetries;
    }

    if (!Array.isArray(args)) {
        this.emit('log:error', 'Event arguments not provided as an array', {eventName: event, eventArgs: args});
        return false;
    }

    // if a listener exists, call it
    if (this.listeners(event).length > 0) {
        args.unshift(event);
        this.emit.apply(this, args);
        return true;
    }

    // give up if no more retries
    if (retries < 1) {
        this.emit('log:fatal', 'Timed out while waiting for listener', {eventName: event, eventArgs: args});
        return false;
    }

    // if no listener, retry
    setTimeout(this.insist.bind(this, event, args, retries - 1), this.retryMs);
    return true;
};

/**
 * Load event listeners
 */
emitter.autoload = function (dir) {
    'use strict';

    dir = dir || __dirname;

    function statPath(itemPath, err, stats) {
        var parsedPath;

        if (stats.isDirectory()) {
            this.autoload(itemPath);
            return;
        }

        // exclude dot files and non-js files
        parsedPath = path.parse(itemPath);

        if (parsedPath.name.indexOf('.') === 0) {
            return;
        }

        if (parsedPath.ext !== '.js') {
            return;
        }

        // only consider files
        if (!stats.isFile()) {
            return;
        }

        this.load(itemPath);
    }

    fs.readdir(dir, function (err, items) {
        if (err) {
            throw err;
        }

        // prepend directory
        items = items.map(function (item) {
            return path.join(dir, item);
        });

        // prevent self-loading
        items = items.filter(function (item) {
            return item !== __filename;
        });

        items.forEach(function (item) {
            fs.lstat(item, statPath.bind(this, item));
        }.bind(this));

    }.bind(this));

    return this;
};

emitter.load = function (filePath, root) {
    'use strict';

    var event, module, parsedPath, relPath;
    parsedPath = path.parse(filePath);
    root = root || __dirname;
    relPath = filePath.replace(root, '').replace(path.sep, '');

    // the event name is derived from the file path
    event = relPath.replace(parsedPath.ext, '');

    event = event.split(path.sep);
    if (event[event.length - 1] === 'index') {
        event.pop();
    }

    event = event.join(':');

    module = require(filePath);

    if (typeof module === 'function') {
        this.on(event, module);
    }
};

module.exports = emitter;
