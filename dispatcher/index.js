var fs = require('fs');
var path = require('path');
var events = require('events');

var emitter = new events.EventEmitter();

// How long to wait between retries
emitter.retryMs = 5;

// How many retries to make
emitter.maxRetries = 100;

/**
 * Emit an event repeatedly until a listener is available
 */
emitter.insist = function (event, args, retries) {
    if (!event) {
        return false;
    }

    if (args === undefined) {
        args = [];
    }

    if (retries === undefined) {
        retries = emitter.maxRetries;
    }

    // if a listener exists, call it
    if (this.listeners(event).length > 0) {
        args.unshift(event);
        this.emit.apply(this, args);
        return true;
    }

    // give up if no more retries
    if (retries < 1) {
        this.emit('log:fatal', {event: event, args: args}, 'Timed out while waiting for listener');
        return false;
    }

    // if no listener, retry
    setTimeout(this.insist.bind(this, event, args, retries - 1), this.retryMs);
};

/**
 * Load event listeners
 */
emitter.autoload = function (dir) {
    var callbacks = {};
    dir = dir || __dirname;

    callbacks.readdir = function (err, items) {
        if (err) {
            console.log(err);
            process.exit(1);
        }
        items.forEach(callbacks.item.bind(this));
    };

    callbacks.item = function (item) {
        var itemPath = path.join(dir, item);
        fs.stat(itemPath, callbacks.stat.bind(this, itemPath));
    };

    callbacks.stat = function (itemPath, err, stats) {
        var parsedPath = path.parse(itemPath);

        if (err) {
            if (err.code === 'ENOENT') {
                return;
            }
            console.log(err);
            process.exit(1);
        } else if (stats.isDirectory()) {
            this.autoload(itemPath);
        } else if (stats.isFile()) {
            // only consider js files
            if (parsedPath.ext !== '.js') {
                return;
            }
            
            // ignore this file
            if (itemPath === __filename) {
                return;
            }
            
            // ignore dot files
            if (parsedPath.base.indexOf('.') === 0) {
                return;
            }
            
            this.load(itemPath);
        }
    };

    fs.readdir(dir, callbacks.readdir.bind(this));
};

emitter.load = function (filePath) {
    var parsedPath, relPath, event, module;
    parsedPath = path.parse(filePath);
    relPath = filePath.replace(__dirname + path.sep, '');

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
