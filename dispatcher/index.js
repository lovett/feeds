'use strict';

// Set up the dispatcher.
//
// The dispatcher is an event emitter configured with faux-namespaced
// events. The first segment of an event name is its group, and the
// second is the action it is responsible for. Groups are just a means
// of organization and not otherwise significant.
//
// When an event listener needs to signal completion of a task, it
// will emit its own name appended with ':done'.

const events = require('events');
const emitter = new events.EventEmitter();

// An event is only allowed 2 listeners: one for the logger, and the
// other for the listener. Enforcing this limit is a protection
// against unexpected behavior.
emitter.setMaxListeners(2);

// A place to keep track of which events have been set up for logging.
emitter._loggedEvents = {};

// Logging
emitter.on('log:debug', require('./log/debug'));
emitter.on('log:error', require('./log/error'));
emitter.on('log:info', require('./log/info'));
emitter.on('log:warn', require('./log/warn'));

emitter.on('newListener', require('./log/register'));
emitter.on('removeListener', require('./log/unregister'));

// Startup
emitter.once('startup', require('./startup'));

// Feeds
emitter.on('feed:poll', require('./feed/poll'));
emitter.on('feed:watch', require('./feed/watch'));
emitter.on('feed:rewatch', require('./feed/rewatch'));
emitter.on('feed:unwatch', require('./feed/unwatch'));
emitter.on('feed:watched', require('./feed/watched'));
emitter.on('feed:list', require('./feed/list'));
emitter.on('feed:add', require('./feed/add'));
emitter.on('feed:update', require('./feed/update'));
emitter.on('feed:purge', require('./feed/purge'));

// Fetching
emitter.on('fetch', require('./fetch/index'));

// History
emitter.on('history:add', require('./history/add'));

// Entries
emitter.on('entry:store', require('./entry/store'));

// Discussions
emitter.on('discussion:store', require('./discussion/store'));

// Filtering
emitter.on('filter:apply', require('./filter/apply'));
emitter.on('filter:remove', require('./filter/remove'));
emitter.on('filter:store', require('./filter/store'));

module.exports = emitter;
