'use strict';

const events = require('events');
const emitter = new events.EventEmitter();

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

// Remove a URL from a user's feed list
emitter.on('feed:unwatch', require('./feed/unwatch'));

// List a user's subscribed feeds
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

emitter.on('test', function () {
    console.log('hello world');
});

module.exports = emitter;
