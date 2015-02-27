var fs = require('fs');
var path = require('path');
var events = require('events');

var emitter = new events.EventEmitter();

/**
 * Emit an event repeatedly until a listener is available
 */
emitter.insist = function () {
    // convert the arguments object to an array
    var args = Array.prototype.slice.apply(arguments);

    // if a listener is available, use it
    if (this.listeners(args[0]).length > 0) {
        this.emit.apply(this, args);
        return;
    }

    // if no listener, re-emit
    setImmediate(function () {
        console.log('reemit ' + args);
        this.insist.apply(this, args);
    }.bind(this));
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
