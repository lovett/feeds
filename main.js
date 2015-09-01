'use strict';

var bunyan, db, dispatcher, env, fs, logger, sqlite3;

bunyan = require('bunyan');
dispatcher = require('./dispatcher');
fs = require('fs');
sqlite3 = require('sqlite3');

/**
 * Environment variables
 * --------------------------------------------------------------------
 *
 * If the file env.json exists, declare its contents as environment
 * variables.
 */

try {
    env = fs.readFileSync('env.json', {encoding: 'utf8'});
    env = JSON.parse(env);

    Object.keys(env).forEach(function (key) {
        process.env[key] = env[key];
    });
} catch (e) {
    console.log(e);
}


db = new sqlite3.Database(process.env.HEADLINES_DB_NAME);

if (process.env.HEADLINES_LOG) {
    logger = bunyan.createLogger({
        name: 'headlines',
        streams: [
            {
                path: 'test.log',
                level: process.env.HEADLINES_LOG_LEVEL || 'trace'
            }
        ]
    });
}

dispatcher.on('feed:subscribe:done', function () {
    dispatcher.emit('filter:store', db, {
        feedId: 1,
        userId: 1,
        value: 'title contains authentication',
        weight: -1
    });
    dispatcher.emit('filter:store', db, {
        feedId: 1,
        userId: 1,
        value: 'title contains iphone',
        weight: -2
    });
    dispatcher.emit('filter:store', db, {
        feedId: 1,
        userId: 1,
        value: 'comments > 200',
        weight: 5
    });
});

dispatcher.once('filter:store:done', function () {
    console.log('Added filter');
    dispatcher.insist('poll', db);
});


dispatcher.on('poll:done', function () {
    console.log('Poll is complete');
});

dispatcher.on('fetch:done', function (feed) {
    feed.type = 'fetch';
    dispatcher.insist('history:add', db, feed);

    if (feed.status >= 301 && feed.status <= 303 && feed.headers.hasOwnProperty('location')) {
        dispatcher.insist('feed:update', db, {
            id: feed.id,
            url: feed.headers.location
        });
    }
});

dispatcher.on('entry', function (entry) {
    dispatcher.insist('entry:store', db, entry);
});

dispatcher.on('discussion', function (discussion) {
    dispatcher.insist('discussion:store', db, discussion);
});

dispatcher.on('log', function (level, message, fields) {
    if (level === 'trace') {
        return;
    }
    console.log(message, fields || '');
});


/*dispatcher.once('unlisten:done', function (params) {
    console.log('unlistened to', params.event);
});*/

dispatcher.once('setup:done', function () {

    db.run('INSERT OR IGNORE INTO users (username, passwordHash) VALUES ("test", "test")', function (err) {
        if (err) {
            throw err;
        }

        dispatcher.insist('feed:subscribe', db, {
            url: 'http://localhost/~blovett/slashdot.rdf',
            userId: this.lastID
        });

        /*dispatcher.insist('feed:subscribe', db, {
            url: 'http://localhost/~blovett/debian.rdf',
            userId: this.lastID
        });*/
        /*dispatcher.insist('feed:subscribe', db, {
            url: 'http://localhost/~blovett/lobster.rss',
            userId: this.lastID
        });*/
        /*dispatcher.insist('feed:subscribe', db, {
            url: 'http://httpbin.org/redirect-to?url=http://example.com',
            userId: this.lastID
            });*/

        /*dispatcher.insist('feed:subscribe', db, {
            url: 'http://localhost/~blovett/google-drive.atom',
            userId: this.lastID
        });*/

        /*dispatcher.insist('feed:subscribe', db, {
            url: 'http://emacs.stackexchange.com',
            userId: this.lastID
        });*/

        /*dispatcher.insist('feed:subscribe', db, {
            url: 'http://www.reddit.com/r/angularjs/.rss',
            userId: this.lastID
        });*/
    });
});

dispatcher.autoload();
dispatcher.insist('setup', db);
