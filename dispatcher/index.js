'use strict';

const events = require('events');
const emitter = new events.EventEmitter();

// Database initialization
emitter.once('setup', require('./setup'));

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

// Add a URL to the list of feeds
emitter.on('feed:subscribe', require('./feed/subscribe'));

// Change a feed's URL
emitter.on('feed:update', require('./feed/update'));

// Save an item found in a feed
emitter.on('entry:store', require('./entry/store'));

// Update the comment count for an entry
emitter.on('discussion:store', require('./discussion/store'));

module.exports = emitter;
