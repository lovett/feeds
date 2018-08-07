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
 * @listens feed-abandon
 * @listens feed-add
 * @listens feed-assess
 * @listens feed-watched
 * @listens feed-unwatch
 * @listens feed-update
 * @listens feed-purge
 * @listens feed-watch
 * @listens feed-poll
 * @listens fetch-feed
 * @listens fetch-hackernews
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
emitter.on('log:debug', require('./log/debug'));
emitter.on('log:error', require('./log/error'));
emitter.on('log:info', require('./log/info'));
emitter.on('log:warn', require('./log/warn'));

emitter.on('newListener', require('./log/register'));
emitter.on('removeListener', require('./log/unregister'));

// Startup
emitter.once('startup', require('./startup'));

// Schema creation and upgrade
emitter.on('schema', require('./schema'));

// Feeds
emitter.on('feed-poll', require('./feed/poll'));
emitter.on('feed-watch', require('./feed/watch'));
emitter.on('feed-unwatch', require('./feed/unwatch'));
emitter.on('feed-watched', require('./feed/watched'));
emitter.on('feed-add', require('./feed/add'));
emitter.on('feed:get', require('./feed/get'));
emitter.on('feed-update', require('./feed/update'));
emitter.on('feed-purge', require('./feed/purge'));
emitter.on('feed:reschedule', require('./feed/reschedule'));
emitter.on('feed-assess', require('./feed/assess'));
emitter.on('feed-abandon', require('./feed/abandon'));
emitter.on('feed:entries', require('./feed/entries'));

// Fetching
emitter.on('fetch', require('./fetch/index'));
emitter.on('fetch-feed', require('./fetch/feed'));
emitter.on('fetch-hackernews', require('./fetch/hackernews'));
emitter.on('fetch:reddit', require('./fetch/reddit'));

// Stats
emitter.on('stats:fetch', require('./stats/fetch'));

// Entries
emitter.on('entry:store', require('./entry/store'));
emitter.on('entry:assign', require('./entry/assign'));

// Discussions
emitter.on('discussion:store', require('./discussion/store'));
emitter.on('discussion:recount', require('./discussion/recount'));
emitter.on('discussion:list', require('./discussion/list'));

// Filtering
emitter.on('filter:apply', require('./filter/apply'));
emitter.on('filter:remove', require('./filter/remove'));
emitter.on('filter:store', require('./filter/store'));

module.exports = emitter;
