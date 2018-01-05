'use strict';

const dispatcher = require('../dispatcher');
const path = require('path');
const restify = require('restify');

/**
 * Configuration
 *
 * Default values can be overridden by either environment variables or
 * argv.
 *
 * Environment variables should be prefixed with "HEADLINES_" but
 * command-line arguments should be lowercase and be prefixed with a
 * double dash.
 *
 * The default database path is the application root, which is the
 * parent directory of this file.
 */
const config = {
    'DB': path.join(path.dirname(process.argv[1]), '../', 'headlines.sqlite'),
    'HOST': '0.0.0.0',
    'PORT': 8081,
    'LOG': 'headlines-new.log'
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

server.get('/', restify.plugins.serveStatic({
    directory: './static',
    default: 'index.html'
}));

server.get('/subscription', require('./routes/subscription-list'));
server.post('/subscription', require('./routes/subscription-create'));
server.put('/subscription', require('./routes/subscription-update'));
server.del('/subscription', require('./routes/subscription-destroy'));

server.get('/feed', require('./routes/feed-list'));
server.post('/feed', require('./routes/feed-create'));
server.put('/feed', require('./routes/feed-update'));
server.del('/feed', require('./routes/feed-destroy'));


/**
 * Dispatcher
 */
dispatcher.once('startup:done', () => {
    server.listen(config.PORT, config.HOST, function() {
        console.log(`${server.name} has started`);
        console.log(`URL: ${server.url}`);
        console.log(`DB:  ${config['DB']}`);
    });
});

dispatcher.emit('startup', config['DB']);

/**
 * Shutdown
 *
 * Nodemon sends the SIGUSR2 signal during restart. This handler is an
 * opportunity to perform cleanup.
 */
process.once('SIGUSR2', function () {
    process.kill(process.pid, 'SIGUSR2');
});
