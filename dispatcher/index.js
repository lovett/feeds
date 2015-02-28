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
    dir = dir || __dirname;

    function statPath(itemPath, err, stats) {
        var parsedPath;

        if (err) {
            if (err.code === 'ENOENT') {
                return;
            }
            console.log(err);
            process.exit(1);
        }

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
        if (stats.isFile()) {
            this.load(itemPath);
        }
    }

    fs.readdir(dir, function (err, items) {
        if (err) {
            console.log(err);
            process.exit();
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
            fs.stat(item, statPath.bind(this, item));
        }.bind(this));

    }.bind(this));

    return this;
};

emitter.load = function (filePath, root) {
    var parsedPath, relPath, event, module;
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
