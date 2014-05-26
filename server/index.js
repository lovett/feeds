var world = require('../world');
var restify = require('restify');
var server = restify.createServer();
var elasticsearch = require('elasticsearch');
var logger = world.logger.child({source: 'webserver'});

/**
 * Standard middleware
 * --------------------------------------------------------------------
 */
server.use(restify.queryParser({ mapParams: false }));
server.use(restify.gzipResponse());
server.use(restify.bodyParser({ mapParams: false }));


/**
 * Logging
 * --------------------------------------------------------------------
 */
server.on('after', restify.auditLogger({
    log: logger
}));

/**
 * Custom middleware for mapping requests to index.html
 * --------------------------------------------------------------------
 *
 * Certain URLs should return the contents of dist/index.html to
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

    var roots = ['search', 'entries', 'feeds'];
    var path = request.path().split('/');

    // The first element will be empty due to the request path's
    // leading slash. The actual root is in path[1]
    if (roots.indexOf(path[1]) == -1) {
        return next();
    }

    world.fs.readFile('./dist/index.html', function (err, data) {
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
 * Custom middleware for casting request parameters to expected data types
 * --------------------------------------------------------------------
 * If we get something that should be an array, but isn't, make it so. 
 */
server.use(function (request, response, next) {
    if (request.method !== 'POST') return next();
    
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
 * Return a list of subscribed feeds
 * --------------------------------------------------------------------
 */
var feedList = function (request, response, next) {
    var key;
    var feeds = {};
    var multi = world.redisClient.multi();

    key = world.keys.feedListKey(1);

    world.redisClient.smembers(key, function (err, result) {
        result.forEach(function (feedId) {

            // User-specific fields
            key = world.keys.feedKey(feedId, 1);
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

        multi.exec(function (err, result) {
            response.send({
                feeds: feeds
            });
            return next();
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
        multi.srem(world.keys.feedListKey(1), feedId);
        multi.srem(world.keys.feedSubscribersKey(feedId), 1);
        multi.zincrby(world.keys.feedSubscriptionsKey, -1, feedId);
        multi.publish('feed:reschedule', feedId);
    });

    multi.exec(function (err, result) {
        next.ifError(err);
        return next();
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
        var feed = {}
        feed.url = item.url || null;
        feed.name = item.name || feed.url;

        if (!feed.url) {
            return next(new restify.InvalidArgumentError("Feed URL not specified"));
        }

        feeds.push(feed);
    });

    feeds.forEach(function (feed) {
        var key, feedId;

        feedId = world.hash(feed.url);

        // Subscribe the user to the feed
        // (for now, fake the user id)
        key = world.keys.feedListKey(1);
        multi.sadd(key, feedId);

        // Account for the subscription in the reverse direction
        // (for now, fake the user id)
        key = world.keys.feedSubscribersKey(feedId);
        multi.sadd(key, 1);

        // User-specific metadata about the feed
        // (for now, fake the user id)
        key = world.keys.feedKey(feedId, 1);
        multi.hmset(key, {
            name: feed.name,
            subscribed: +new Date(),
        });

        // User-netutral metdata about the feed
        key = world.keys.feedKey(feedId);
        multi.hsetnx(key, 'url', feed.url);

        // Update the total subscriptions to this feed
        key = world.keys.feedSubscriptionsKey;

        multi.zincrby(key, 1, feedId);

        multi.publish('feed:reschedule', feedId);
        request.log.trace({feed: feedId}, 'reschedule');

    });

    multi.exec(function (err, result) {
        next.ifError(err);
        next();
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
            multi.hgetall('entry:' + hit.fields.entry_id, function (err, entry) {
                entry.id = hit.fields.entry_id;
                return entry;
            });
        });

        multi.exec(function (err, result) {
            var total_entries = result.shift();
            response.send({
                list_size: total_entries,
                entries: result
            });
        });

    }

    var failure = function (error) {
        response.send(error);
    }

    search.then(success, failure);
    next();
};

var entryList = function (request, response, next) {
    var page = Math.abs(request.query.page) || 1;
    var pageSize = Math.min(Math.abs(request.query.page_size) || 10, 50);
    var start = (page - 1) * pageSize;
    var end = start + pageSize - 1;

    var key;

    if (request.params.name == 'unread') {
        // (for now, fake the user id)
        key = world.keys.unreadKey(1);
    } else {
        // TODO: handle other lists
        next();
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
                list_size: totalEntries,
                page: page,
                page_count: Math.ceil(totalEntries / pageSize),
                page_size: pageSize,
                page_start: start,
                entries: results
            });
            return next();
        });
    });
};

var listUpdate = function (request, response, next) {
    var key, multi;

    key = 'entries:' + request.params.name;

    multi = world.redisClient.multi();
    request.body.ids.forEach(function (id) {
        multi.zrem(key, id);
        multi.zrem('entries:kept', id);
        if (request.body.hasOwnProperty('keep') && request.body.keep) {
            multi.zadd('entries:kept', +new Date(), id);
            multi.publish('entry:download', id);
        }
    });

    multi.exec(function (err, result) {
        response.send(204);
        return next();
    });
};

/**
 * Routes
 * --------------------------------------------------------------------
 */
server.get('/list/feeds', feedList);
server.post('/list/feeds', feedSubscribe, feedUnsubscribe, feedList);

server.get('/list/:name', entryList);
server.post('/list/:name', listUpdate);

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
    'directory': './dist/',
    'default': 'index.html'
}));

/**
 * Listening begins
 * --------------------------------------------------------------------
 */
server.listen(world.config.http.port, function() {
    console.log('Listening on %s', server.url);
});
