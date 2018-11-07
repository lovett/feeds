/**
 * The dispatcher is an event emitter. Its job is to perform
 * server-side work related to feed management and ingestion, and to
 * provide the results of that work to the UI.
 *
 * Event names are either single words or multiple words delimted by
 * dashes. The first word of a delimited name is the group, which
 * serves as a means of organization and is not otherwise
 * significant. Group names usually correspond to subdirectories.
 *
 * The second segment of a delimited name is the action, and
 * corresponds to a file name. Additional segments are used as needed
 * but don't have filesystem mappings.
 *
 * @module dispatcher
 * @listens fetch
 * @listens schema
 * @listens startup
 * @listens entry-assign
 * @listens entry-store
 * @listens entry-user-update
 * @listens feed-abandon
 * @listens feed-add
 * @listens feed-assess
 * @listens feed-entries
 * @listens feed-get
 * @listens feed-subscribed
 * @listens feed-unsubscribe
 * @listens feed-update
 * @listens feed-purge
 * @listens feed-subscribe
 * @listens feed-poll
 * @listens fetch-feed
 * @listens fetch-hackernews
 * @listens filter-apply
 * @listens filter-store
 * @listens filter-remove
 * @listens stats-fetch
 * @listens stats-by-feed
 * @listens log
 * @listens log-debug
 * @listens log-error
 * @listens log-info
 * @listens log-warn
 * @listens newListener
 * @listens removeListener
 */
'use strict';

const events = require('events');
const emitter = new events.EventEmitter();

// An event is only allowed 2 listeners: one for logging, and one for
// execution.
emitter.setMaxListeners(2);

// A place to keep track of which events have been set up for logging.
emitter._loggedEvents = {};

// Logging
emitter.on('log', require('./log/index'));

/**
 * Alias method for invoking log event with level debug
 *
 * @event log-debug
 * @see event:log
 * @property {String} message - A JSON-friendly, human-readable message.
 */
emitter.on('log-debug', (message) => emitter.emit('log', 'debug', {message,}));

/**
 * Alias method for invoking log event with level error
 *
 * @event log-error
 * @see event:log
 * @property {String} message - A JSON-friendly, human-readable message.
 */
emitter.on('log-error', (message) => emitter.emit('log', 'error', {message,}));

/**
 * Alias method for invoking log event with level info
 *
 * @event log-info
 * @see event:log
 * @property {String} message - A JSON-friendly, human-readable message.
 */
emitter.on('log-info', (message) => emitter.emit('log', 'info', {message,}));

/**
 * Alias method for invoking log event with level warn
 *
 * @event log-warn
 * @see event:log
 * @property {String} message - A JSON-friendly, human-readable message.
 */
emitter.on('log-warn', (message) => emitter.emit('log', 'warn', {message,}));

emitter.on('newListener', require('./log/register'));
emitter.on('removeListener', require('./log/unregister'));

// Startup
emitter.once('startup', require('./startup'));

// Schema creation and upgrade
emitter.on('schema', require('./schema'));

// Feeds
emitter.on('feed-poll', require('./feed/poll'));
emitter.on('feed-subscribe', require('./feed/subscribe'));
emitter.on('feed-unsubscribe', require('./feed/unsubscribe'));
emitter.on('feed-subscribed', require('./feed/subscribed'));
emitter.on('feed-add', require('./feed/add'));
emitter.on('feed-get', require('./feed/get'));
emitter.on('feed-update', require('./feed/update'));
emitter.on('feed-purge', require('./feed/purge'));
emitter.on('feed-reschedule', require('./feed/reschedule'));
emitter.on('feed-assess', require('./feed/assess'));
emitter.on('feed-abandon', require('./feed/abandon'));
emitter.on('feed-entries', require('./feed/entries'));

// Fetching
emitter.on('fetch', require('./fetch/index'));
emitter.on('fetch-feed', require('./fetch/feed'));
emitter.on('fetch-hackernews', require('./fetch/hackernews'));
emitter.on('fetch-reddit', require('./fetch/reddit'));

// Stats
emitter.on('stats-fetch', require('./stats/fetch'));
emitter.on('stats-by-feed', require('./stats/by-feed'));

// Entries
emitter.on('entry-store', require('./entry/store'));
emitter.on('entry-user-update', require('./entry/user-update'));
emitter.on('entry:assign', require('./entry/assign'));

// Discussions
emitter.on('discussion:store', require('./discussion/store'));
emitter.on('discussion:list', require('./discussion/list'));

// Filtering
emitter.on('filter-apply', require('./filter/apply'));
emitter.on('filter-remove', require('./filter/remove'));
emitter.on('filter-store', require('./filter/store'));

module.exports = emitter;
