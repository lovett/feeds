'use strict';

const dispatcher = require('../dispatcher');
const path = require('path');
const restify = require('restify');

/**
 * Configuration
 *
 * The default values defined here can be overridden by either
 * environment variables or command-line arguments.
 *
 * Environment variables should be uppercase and prefixed with
 * "HEADLINES_". Command-line arguments should be lowercase and
 * prefixed with a double dash.
 *
 * The default database path is the application root, which is the
 * parent directory of this file.
 */
const config = {
    'DB': path.join(path.dirname(process.argv[1]), '../', 'headlines.sqlite'),
    'HOST': '0.0.0.0',
    'PORT': 8081,
    'LOG': 'headlines.log',
    'SCHEMA_ROOT': path.join(path.dirname(process.argv[1]), '../', 'schema')
};

Object.keys(config).forEach((key, _) => {
    const envKeyword = 'HEADLINES_' + key.toUpperCase();
    if (process.env.hasOwnProperty(envKeyword)) {
        config[key] = process.env[envKeyword];
    }
});

process.argv.forEach((arg, index) => {
    if (arg.startsWith('--')) {
        const key = arg.substring(2).toUpperCase();
        if (config.hasOwnProperty(key) && process.argv[index + 1]) {
            config[key] = process.argv[index+1];
        }
    }
});

/**
 * Web server
 */
const server = restify.createServer({
    name: 'headlines'
});

server.use(restify.plugins.bodyParser());

server.get('/subscription', require('./routes/subscription-list'));
server.post('/subscription', require('./routes/subscription-create'));
server.put('/subscription', require('./routes/subscription-update'));
server.del('/subscription', require('./routes/subscription-destroy'));

server.get('/feed/:feedId', require('./routes/feed-entries'));
server.post('/feed', require('./routes/feed-create'));
server.put('/feed', require('./routes/feed-update'));
server.del('/feed', require('./routes/feed-destroy'));

server.get('*', restify.plugins.serveStatic({
    directory: './server/static',
    default: 'index.html',
    maxAge: 1
}));

/**
 * Dispatcher
 */
dispatcher.emit('startup', config.DB, config.SCHEMA_ROOT, () => {
    server.listen(config.PORT, config.HOST, function() {
        dispatcher.emit('log:info', `listening on ${server.url}`);
        dispatcher.emit('feed:poll');
    });
});
