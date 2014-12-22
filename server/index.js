var world = require('../world');
var crypto = require('crypto');
var restify = require('restify');
var elasticsearch = require('elasticsearch');
var logger = world.logger.child({source: 'webserver'});
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var util = require('util');
var builder = require('xmlbuilder');

var server = restify.createServer({
    formatters: {
        'text/xml; q=0.9': function formatFoo(request, response, body) {
            if (body instanceof Error) {
                return body.stack;
            }

            if (Buffer.isBuffer(body)) {
                // ??
                return body.stack;
            }

            var xml = builder.create('opml').att({ 'version': '2.0'});
            var headNode = xml.ele('head');
            var bodyNode= xml.ele('body');

            if (body.hasOwnProperty('feeds')) {
                headNode.ele('title', 'Subscribed Feeds');
                headNode.ele('dateCreated', new Date());
                Object.keys(body.feeds).forEach(function (id) {
                    var feed = body.feeds[id];
                    bodyNode.ele('outline', {
                        title: feed.name,
                        xmlUrl: feed.url
                    });
                });

            }
            return xml.end({ pretty: true});
        }
    }
});

server.acceptable.push('text/xml');

/**
 * Standard middleware
 * --------------------------------------------------------------------
 */
server.use(restify.acceptParser(server.acceptable));
server.use(restify.queryParser({ mapParams: false }));
server.use(restify.gzipResponse());
server.use(restify.bodyParser({ mapParams: false }));


/**
 * Logging
 * --------------------------------------------------------------------
 */
//server.on('after', restify.auditLogger({
//    log: logger
//}));

/**
 * Custom middleware for mapping requests to index.html
 * --------------------------------------------------------------------
 *
 * Certain URLs should return the contents of static/index.html to
 * enable the single page application model. But this mapping should
 * not interfere with 404 handling.
 *
 * Restify's serveStatic middleware can't accommodate this because
 * it's a rewrite--the file path served is not the file path
 * requested.
 *
 * This needs to be registered before any routes.
 */
server.use(function (request, response, next) {

    // Json requests will be handled elsewhere
    if (request.is('json')) {
        return next();
    }

    var aliases = ['search', 'entries', 'feeds', 'login', 'logout', 'signup'];
    var path = request.path().split('/');

    // The first element will be empty due to the request path's
    // leading slash. The actual root is in path[1]
    if (aliases.indexOf(path[1]) === -1) {
        return next();
    }

    world.fs.readFile('./static/index.html', function (err, data) {
        if (err) {
            next(err);
            return;
        }

        response.setHeader('Content-Type', 'text/html');
        response.writeHead(200);
        response.end(data);
        return next(false);
    });
});


/**
 * Custom middleware for serving crossdomain.xml as
 * text/x-cross-domain-policy *
 * --------------------------------------------------------------------
 */
server.use(function (request, response, next) {
    if (request.path() !== '/crossdomain.xml') {
        return next();
    }

    world.fs.readFile('./static/crossdomain.xml', function (err, data) {
        if (err) {
            next(err);
            return;
        }
        response.setHeader('Content-Type', 'text/x-cross-domain-policy');
        response.writeHead(200);
        response.end(data);
        return next(false);
    });
});


/**
 * Custom middlware for serving less files
 *
 * They would otherwise go out as application/octet-stream, which the
 * browser would be unable to display.
 * --------------------------------------------------------------------
 */
server.use(function (request, response, next) {

    var path = request.path();

    if (!path.match(/\.less$/)) {
        next();
    }

    var fileName = path.split('/').pop();

    world.fs.readFile('./static/less/' + fileName, function (err, data) {
        if (err) {
            next(err);
            return;
        }
        response.setHeader('Content-Type', 'text/css');
        response.writeHead(200);
        response.end(data);
        return next(false);
    });
});


/**
 * Custom middleware for casting request parameters to expected data types
 * --------------------------------------------------------------------
 * If we get something that should be an array, but isn't, make it so.
 */
server.use(function (request, response, next) {
    if (request.method !== 'POST') {
        return next();
    }

    var keys = ['subscribe', 'unsubscribe'];
    keys.forEach(function (key) {
        if (!request.body.hasOwnProperty(key)) {
            return;
        }

        if (!(request.body[key] instanceof Array)) {
            request.body[key] = [request.body[key]];
        }
    });

    return next();

});

/**
 * Authentication configuration
 * --------------------------------------------------------------------
 */
passport.use(new LocalStrategy(function(username, password, done) {
    var userKey = world.keys.userKey(username);

    world.redisClient.get(userKey, function (err, result) {
        if (result === null) {
            return done(null, false, { message: 'Invalid login'});
        }

        var segments = result.split('/');
        var id = segments.shift();
        var salt = segments.shift();
        var hash = segments.shift();

        world.userHash(password, salt, function (err, testHash) {
            if (testHash.toString('hex') === hash) {
                return done(null, { id: id});
            } else {
                return done(null, false, { message: 'Invalid login'});
            }
        });
    });
}));

// Authentication
server.use(passport.initialize());


/**
 * Return a list of subscribed feeds
 * --------------------------------------------------------------------
 */
var feedList = function (request, response, next) {
    var key;
    var feeds = {};
    var multi = world.redisClient.multi();

    key = world.keys.feedListKey(request.user.id);

    world.redisClient.smembers(key, function (err, result) {
        result.forEach(function (feedId) {

            // User-specific fields
            key = world.keys.feedKey(feedId, request.user.id);
            multi.hgetall(key, function (err, feed) {
                feeds[feedId] = feed;
            });

            // User-agnostic fields
            key = world.keys.feedKey(feedId);
            multi.hgetall(key, function (err, result) {
                result = result || {};
                Object.keys(result).forEach(function (key) {
                    feeds[feedId][key] = result[key];
                });
            });

        });

        multi.exec(function (err) {
            if (err) {
                logger.error({redis: err}, 'redis error');
                response.send(500);
                next(false);
            } else {
                response.send({
                    feeds: feeds
                });
            }
            next();
        });
    });
};

/**
 * Unsubscribe from a feed
 * --------------------------------------------------------------------
 *
 * The feed's entries will be kept.
 */
var feedUnsubscribe = function (request, response, next) {
    var multi = world.redisClient.multi();

    if (!request.body.hasOwnProperty('unsubscribe')) {
        return next();
    }

    request.body.unsubscribe.forEach(function (feedId) {
        // Remove the feed from the user's subscription list
        multi.srem(world.keys.feedListKey(request.user.id), feedId);

        // Remove the user from the feed's user list
        var key = world.keys.feedSubscribersKey(feedId);
        multi.srem(key, request.user.id);

        // Update the total subscriptions to this feed
        multi.scard(key, function (err, count) {
            var key = world.keys.feedSubscriptionsKey;
            world.redisClient.zadd(key, count, feedId);
        });
    });

    multi.exec(function (err) {
        if (err) {
            logger.error({redis: err}, 'redis error');
            response.send(500, {
                message: err
            });
            next(false);
        } else {
            next();
        }
    });
};

/**
 * Update an existing feed
 * --------------------------------------------------------------------
 *
 */
var feedUpdate = function (request, response, next) {
    if (!request.params.hasOwnProperty('id')) {
        response.send(400, {
            message: 'feed id not specified'
        });
        return next(false);
    }

    var key = world.keys.feedKey(request.params.id, request.user.id);
    world.redisClient.hgetall(key, function (err, feed) {
        if (err) {
            response.send(500);
            return next(false);
        }

        if (!feed) {
            response.send(400, {
                message: 'subscription not found'
            });
            return next(false);
        }

        if (request.body.hasOwnProperty('reschedule')) {
            var when = parseInt(request.body.reschedule, 10);

            world.redisClient.publish('feed:reschedule', request.params.id + '::' + when, function (err) {
                if (err) {
                    response.send(500);
                    return next(false);
                }
                response.send({
                    id: request.params.id,
                    nextCheck: when
                });
                next();
            });
        }
    });
};

/**
 * Subscribe to a feed
 * --------------------------------------------------------------------
 *
 * Resubscribing to an already-subscribed feed is allowed.
 */
var feedSubscribe = function (request, response, next) {

    var multi = world.redisClient.multi();

    var feeds = [];

    if (!request.body.hasOwnProperty('subscribe')) {
        return next();
    }

    request.body.subscribe.forEach(function (item) {
        var feed = {};
        feed.url = item.url || null;
        feed.name = item.name || feed.url;

        if (!feed.url) {
            return next(new restify.InvalidArgumentError('Feed URL not specified'));
        }

        feeds.push(feed);
    });

    feeds.forEach(function (feed) {
        var key, feedId;

        feedId = world.hash(feed.url);

        // Subscribe the user to the feed
        key = world.keys.feedListKey(request.user.id);
        multi.sadd(key, feedId);

        // Associate the feed with the user
        key = world.keys.feedSubscribersKey(feedId);
        multi.sadd(key, request.user.id);

        // User-specific metadata about the feed
        key = world.keys.feedKey(feedId, request.user.id);
        multi.hmset(key, {
            name: feed.name,
            subscribed: +new Date(),
        });

        // User-netutral metdata about the feed
        key = world.keys.feedKey(feedId);
        multi.hsetnx(key, 'url', feed.url);

        // Update the total subscriptions to this feed
        key = world.keys.feedSubscribersKey(feedId);
        multi.scard(key, function (err, count) {
            var key = world.keys.feedSubscriptionsKey;
            world.redisClient.zadd(key, count, feedId);
            world.redisClient.publish('feed:reschedule', feedId);
        });

        request.log.trace({feed: feedId}, 'reschedule');

    });

    multi.exec(function (err) {
        if (err) {
            logger.error({redis: err}, 'redis error');
            response.send(500, {
                message: err
            });
            next(false);
        } else {
            next();
        }
    });
};

var findEntries = function (request, response, next) {
    var terms = request.params.terms;
    var client = new elasticsearch.Client({
          host: 'localhost:9200',
          log: 'trace'
    });

    var params = {
        q: terms,
        fields: ['entry_id']
    };

    var search = client.search(params);

    var success = function (body) {
        var multi = world.redisClient.multi();

        // entry list
        body.hits.hits.forEach(function (hit) {
            multi.hgetall('entry:' + hit.fields.id, function (err, entry) {
                entry.id = hit.fields.id;
                return entry;
            });
        });

        multi.exec(function (err, result) {
            response.send({
                listSize: result.shift(),
                entries: result
            });
        });

    };

    var failure = function (error) {
        response.send(error);
    };

    search.then(success, failure);
    next();
};

var entryList = function (request, response, next) {
    var page = Math.abs(request.query.page) || 1;
    var pageSize = Math.min(Math.abs(request.query.size) || 10, 50);
    var start = (page - 1) * pageSize;
    var end = start + pageSize - 1;

    var key;

    if (request.params.name === 'unread') {
        key = world.keys.unreadKey(request.user.id);
    } else if (request.params.name === 'saved') {
        key = world.keys.savedKey(request.user.id);
    }

    world.redisClient.lrange(key, start, end, function (err, entryIds) {
        var multi = world.redisClient.multi();

        multi.llen(key, function (err, totalEntries) {
            return totalEntries;
        });

        // entry list
        entryIds.forEach(function (entryId) {
            multi.hgetall(world.keys.entryKey(entryId), function (err, entry) {
                if (err) {
                    logger.error(err);
                    next();
                }

                entry.id = entryId;
                return entry;
            });
        });

        multi.exec(function (err, results) {
            var totalEntries = results.shift();
            response.send({
                listSize: totalEntries,
                page: page,
                pageCount: Math.ceil(totalEntries / pageSize),
                pageSize: pageSize,
                pageStart: start,
                entries: results
            });
            return next();
        });
    });
};

var addToList = function (request, response, next) {
    var multi = world.redisClient.multi();
    var ids = request.body.ids;
    var key;

    if (request.params.name === 'saved') {

        // Add to the saved list
        key = world.keys.savedKey(request.user.id);
        ids.forEach(function (id) {
            multi.lpush(key, id);
            //multi.publish('entry:saved', id);
        });

        // When an entry is saved, it is no longer unread
        // Remove it from the unread list
        key = world.keys.unreadKey(request.user.id);
        ids.forEach(function (id) {
            multi.lrem(key, 0, id);
        });

    } else if (request.params.name === 'unread') {

        // Add to the unread list
        key = world.keys.unreadKey(request.user.id);
        ids.forEach(function (id) {
            multi.lpush(key, id);
        });

        // When an entry is unread, it is no longer saved
        // Remove it from the saved list
        key = world.keys.unreadKey(request.user.id);
        ids.forEach(function (id) {
            multi.lrem(key, 0, id);
            //multi.publish('entry:discarded', id);
        });


    }

    multi.exec(function (err) {
        if (err) {
            logger.error({redis: err}, 'redis error');
            response.send(500);
            next(false);
        } else {
            response.send(204);
            next();
        }
    });
};

var removeFromList = function (request, response, next) {
    var multi = world.redisClient.multi();
    var ids = request.body.ids;
    var key;
    var publishDiscard = false;

    if (request.params.name === 'saved') {
        key = world.keys.savedKey(request.user.id);
        publishDiscard = true;
    } else if (request.params.name === 'unread') {
        key = world.keys.unreadKey(request.user.id);
    }

    ids.forEach(function (id) {
        multi.lrem(key, 0, id);
        if (publishDiscard) {
            multi.publish('entry:discarded', id);
        }
    });

    multi.exec(function (err) {
        if (err) {
            logger.error({redis: err}, 'redis error');
            response.send(500);
            next(false);
        } else {
            response.send(204);
            next();
        }
    });
};

var createUser = function (req, res, next) {
    var username = req.body.username;
    var password = req.body.password;

    crypto.randomBytes(16, function(err, buf) {
        var salt, key;
        if (err) {
            logger.error({err: err}, 'user creation error while generating salt');
            res.send(500);
            next(false);
        }

        salt = buf.toString('hex');

        world.userHash(password, salt, function (err, hash) {
            if (err) {
                logger.error({err: err}, 'user creation error while generating hash');
                res.send(500);
                next(false);
            }

            key = world.keys.userKey(username);

            world.redisClient.incr(world.keys.userIdCounter, function (err, id) {
                if (err) {
                    logger.error({err: err}, 'failed to incremenet user counter');
                    res.send(500);
                    next(false);
                }

                world.redisClient.set(key, util.format('%s/%s/%s', id, salt, hash.toString('hex')));
                res.send(204);
                next();
            });

        });
    });
};

/**
 * Route helpers
 * --------------------------------------------------------------------
 */
var requireAuth = function (request, response, next) {

    var token = request.headers['x-auth'];

    if (!token) {
        response.send(401);
        return next(false);
    }

    world.redisClient.get(world.keys.userTokenKey(token), function (err, result) {
        if (!result) {
            response.send(401);
            return next(false);
        }

        request.user = {
            id: parseInt(result, 10)
        };

        next();
    });
};


/**
 * Routes
 * --------------------------------------------------------------------
 */
server.get('/list/feeds', requireAuth, feedList);
server.post('/list/feeds', requireAuth, feedSubscribe, feedUnsubscribe, feedList);
server.post('/feed/:id', requireAuth, feedUpdate);

server.get('/list/:name', requireAuth, entryList);

server.post('/list/:name/additions', requireAuth, addToList);
server.post('/list/:name/removals', requireAuth, removeFromList);

server.post('/signup', createUser);

server.post('/authenticate', function (request, response, next) {
    if (request.body.action !== 'login') {
        return next();
    }

    passport.authenticate('local', { session: false }, function (err, user) {
        if (err) {
            response.send(500);
            return next(false);
        }

        if (!user) {
            response.send(401);
            return next(false);
        }

        crypto.randomBytes(64, function(err, buf) {
            var token = buf.toString('hex');
            var key = world.keys.userTokenKey(token);
            world.redisClient.set(key, user.id, function (err) {
                if (err) {
                    response.send(500);
                    return next(false);
                }
                world.redisClient.expire(key, 86400 * 30);
                response.send({token: token});
                next();
            });
        });
    })(request, response, next);
}, function (request, response, next) {
    if (request.body.action !== 'logout') {
        return next();
    }

    var key = world.keys.userTokenKey(request.body.token);
    world.redisClient.del(key, function (err) {
        if (err) {
            return next(err);
        }

        response.send(204);
        return next();
    });
});

/**
 * Search
 * --------------------------------------------------------------------
 *
 * Only called if the request has asked for json.
 */
server.get('/search/.*', function (request, response, next) {
    findEntries(request, response, next);
});

/**
 * Static serving of files under dist
 * --------------------------------------------------------------------
 */
server.get('/.*', restify.serveStatic({
    'directory': './static/',
    'default': 'index.html'
}));

/**
 * Listening begins
 * --------------------------------------------------------------------
 */
server.listen(process.env.HEADLINES_HTTP_PORT, process.env.HEADLINES_HTTP_IP, function() {
    logger.info({address: server.url}, 'startup');
});

/**
 * Clean up on shutdown
 * --------------------------------------------------------------------
 * nodemon sends the SIGUSR2 signal during restart
 */
process.once('SIGUSR2', function () {
    logger.info('shutting down');
    process.kill(process.pid, 'SIGUSR2');
});
