var dispatcher = require('./dispatcher');
var fs = require('fs');
var runInterval = 10 * 1000; // 10 seconds

/**
 * Environment variables
 * --------------------------------------------------------------------
 *
 * If the file env.json exists, declare its contents as environment
 * variables.
 */
var env;

try {
    env = fs.readFileSync('env.json', {encoding: 'utf8'});
    env = JSON.parse(env);

    Object.keys(env).forEach(function (key) {
        process.env[key] = env[key];
    });
} catch (e) {
    console.log(e);
}

dispatcher.autoload();

dispatcher.insist('fetch', [1, 'http://www.reddit.com/r/angularjs/.rss']);

