'use strict';

const events = require('events');
const emitter = new events.EventEmitter();

emitter.setMaxListeners(2);

emitter._loggedEvents = {};

// Logging
emitter.on('log:debug', require('./log/debug'));
emitter.on('log:error', require('./log/error'));
emitter.on('log:fatal', require('./log/fatal'));
emitter.on('log:info', require('./log/info'));
emitter.on('log:trace', require('./log/trace'));
emitter.on('log:warn', require('./log/warn'));
emitter.on('log:write', require('./log/write'));

emitter.on('newListener', require('./log/register'));
emitter.on('removeListener', require('./log/unregister'));

// Database initialization
emitter.once('startup', require('./startup'));

// Determine when a feed should be fetched
emitter.on('poll', require('./poll'));

// Track feed fetches over time
emitter.on('history:add', require('./history/add'));

// Manage the filters that are applied to entries
emitter.on('filter:apply', require('./filter/apply'));
emitter.on('filter:remove', require('./filter/remove'));
emitter.on('filter:store', require('./filter/store'));

// Make an HTTP request for a feed
emitter.on('fetch', require('./fetch/index'));

// Add a URL to the a user's feed list
emitter.on('feed:watch', require('./feed/watch'));

// Add a URL to the a user's feed list
emitter.on('feed:rewatch', require('./feed/rewatch'));

// Remove a URL from a user's feed list
emitter.on('feed:unwatch', require('./feed/unwatch'));

// List a user's subscribed feeds
emitter.on('feed:watched', require('./feed/watched'));

// List all feeds
emitter.on('feed:list', require('./feed/list'));

// Add a feed without subscribing to it
emitter.on('feed:add', require('./feed/add'));

// Change a feed's URL
emitter.on('feed:update', require('./feed/update'));

// Delete a feed
emitter.on('feed:purge', require('./feed/purge'));

// Save an item found in a feed
emitter.on('entry:store', require('./entry/store'));

// Update the comment count for an entry
emitter.on('discussion:store', require('./discussion/store'));

module.exports = emitter;
