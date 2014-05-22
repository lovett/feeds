var world = require('../world');
var restify = require('restify');
var fs = require('fs');
var server = restify.createServer();
var elasticsearch = require('elasticsearch');

/**
 * Standard middleware
 * --------------------------------------------------------------------
 */
server.use(restify.queryParser({ mapParams: false }));
server.use(restify.gzipResponse());
server.use(restify.bodyParser({ mapParams: false }));

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

    fs.readFile('./dist/index.html', function (err, data) {
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
 * Return a list of subscribed feeds
 * --------------------------------------------------------------------
 */
var getFeeds = function (request, response, next) {
    world.client.hgetall('feeds', function (err, result) {
        if (!result) {
            response.send({
                feeds: []
            });
            return next();
        }

        var multi = world.client.multi();

        Object.keys(result).forEach(function (key) {
            multi.hgetall('feed:' + key, function (err, feed) {
                return feed;
            });
        });

        multi.exec(function (err, result) {
            response.send({
                feeds: result
            });

            return next();
        });
    });
};

/**
 * Unsubscribe from a feed
 * --------------------------------------------------------------------
 *
 * The feed metadata (feed:<id> key) and its entries will be kept.
 */
var deleteFeed = function (request, response, next) {
    var multi = world.client.multi();

    if (!(request.body instanceof Array)) {
        request.body = [request.body];
    }

    request.body.forEach(function (id) {
        multi.hdel(world.keys.feeds, id);
    });

    multi.exec(function (err, result) {
        next.ifError(err);
        response.send(204);
        next();
    });

};

/**
 * Subscribe to a feed
 * --------------------------------------------------------------------
 *
 * Resubscribing to an already-subscribed feed is allowed.
 */
var putFeed = function (request, response, next) {
    var multi = world.client.multi();

    // accept both single and multiple
    if (!(request.body instanceof Array)) {
        request.body = [request.body];
    }

    var feeds = [];
    request.body.forEach(function (item) {
        var feed = {}
        feed.url = item.url || null;
        feed.name = item.name || feed.url;

        if (!feed.url) {
            return next(new restify.InvalidArgumentError("Feed URL not specified"));
        }

        feed.id = world.hash(feed.url);

        feeds.push(feed);
    });

    feeds.forEach(function (feed) {
        var key = world.keys.feed(feed.id);
        multi.hmset(key, feed);

        key = world.keys.feeds;
        multi.hset(key, feed.id, +new Date());
    });

    multi.exec(function (err, result) {
        next.ifError(err);
        response.send(feeds);
        return next();
    });
};

var postFeed = function (request, response, next) {
    var multi = world.client.multi();

    if (!request.body.hasOwnProperty('add')) {
        request.body.add = [];
    }

    if (!(request.body.add instanceof Array)) {
        request.body.add = [request.body.add];
    }

    if (!request.body.hasOwnProperty('remove')) {
        request.body.remove = [];
    }

    if (!(request.body.remove instanceof Array)) {
        request.body.remove = [request.body.remove];
    }

    request.body.add.forEach(function (feed) {
        multi.hexists('feeds', feed.url, function (err, result) {
            if (result === 0) {
                world.client.incr('feeds:counter', function (err, feed_id) {
                    world.client.hset('feeds', feed.url, feed_id);
                    world.client.hmset('feed:' + feed_id, {
                        'url': feed.url,
                        'name': feed.name,
                        'added': +new Date()
                    });
                    world.client.hset('feeds:schedule', feed_id, world.config.feed_check_interval);
                });
            }
        });
    });

    request.body.remove.forEach(function (url) {
        multi.hget('feeds', url, function (err, feed_id) {
            world.client.del('feeds:' + feed_id);
            world.client.hdel('feeds', url);
            world.client.hdel('feeds:schedule', feed_id);
        });
    });

    multi.exec(function (err, result) {
        response.send(204);
        return next();
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
        var multi = world.client.multi();

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

var getList = function (request, response, next) {
    var page = Math.abs(request.query.page) || 1;
    var page_size = Math.min(Math.abs(request.query.page_size) || 10, 50);
    var start = (page - 1) * page_size;
    var end = start + page_size - 1;
    var key = 'entries:' + request.params.name;

    var method, entry_state;
    if (request.params.name == 'kept') {
        method = 'zrevrange';
        entry_state = 'kept'
    } else {
        method = 'zrange';
        entry_state = 'unread';
    }

    world.client[method](key, start, end, function (err, ids) {
        var multi = world.client.multi();

        multi.zcard(key, function (err, result) {
            return result;
        });

        // entry list
        ids.forEach(function (id) {
            multi.hgetall('entry:' + id, function (err, entry) {
                entry.id = id;
                entry.state = entry_state;
                return entry;
            });
        });

        multi.exec(function (err, result) {
            var total_entries = result.shift();
            response.send({
                list_size: total_entries,
                page: page,
                page_count: Math.ceil(total_entries / page_size),
                page_size: page_size,
                page_start: start,
                entries: result
            });
        });
    });
    return next();
};

var postList = function (request, response, next) {
    var key, multi;

    key = 'entries:' + request.params.name;

    multi = world.client.multi();
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
 * Route setup
 * --------------------------------------------------------------------
 */
server.get('/list/feeds', getFeeds);
server.get('/list/:name', getList);

server.post('/list/feeds', postFeed);
server.post('/list/:name', postList);

server.put('/list/feeds', putFeed);

server.del('/list/feeds', deleteFeed);

/**
 * Run a search
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
    console.log('%s listening at %s', server.name, server.url);
});
