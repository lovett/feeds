var world = require('./world');
var restify = require('restify');
var fs = require('fs');
var server = restify.createServer();


var serveIndex = function (req, res, next) {
    fs.readFile(__dirname + '/public/index.html', function (err, data) {
        if (err) {
            next(err);
            return;
        }

        res.setHeader('Content-Type', 'text/html');
        res.writeHead(200);
        res.end(data);
        next();
    });
};

server.use(restify.queryParser({ mapParams: false }));
server.use(restify.gzipResponse());
server.use(restify.bodyParser({ mapParams: false }));

server.get('/entries/.*', serveIndex);
server.get('/feeds', serveIndex);


server.get('/list/feeds', function (request, response, next) {

    world.client.hgetall('feeds', function (err, result) {
        if (!result) {
            response.send({
                feeds: []
            });
            return next();
        }

        var multi = world.client.multi();

        Object.keys(result).forEach(function (key) {
            multi.hgetall('feed:' + result[key], function (err, feed) {
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
});

server.post('/list/feeds', function (request, response, next) {
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

});

server.get('/list/:name', function getList (request, response, next) {
    var page = Math.abs(request.query.page) || 1;
    var page_size = Math.min(Math.abs(request.query.page_size) || 10, 50);
    var start = (page - 1) * page_size;
    var end = start + page_size - 1;
    var key = 'entries:' + request.params.name;

    var method = (request.params.name == 'kept')? 'zrevrange':'zrange';

    world.client[method](key, start, end, function (err, ids) {
        var multi = world.client.multi();

        multi.zcard(key, function (err, result) {
            return result;
        });

        // entry list
        ids.forEach(function (id) {
            multi.hgetall('entry:' + id, function (err, entry) {
                entry.id = id;
                return entry;
            });
        });

        multi.exec(function (err, result) {
            var total_entries = result.shift();
            response.send({
                entry_count: total_entries,
                page: page,
                page_count: Math.ceil(total_entries / page_size),
                page_size: page_size,
                page_start: start,
                entries: result
            });
        });
    });
    return next();
});

server.post('/list/:name', function (request, response, next) {
    var key, multi;

    key = 'entries:' + request.params.name;

    multi = world.client.multi();
    request.body.ids.forEach(function (id) {
        multi.zrem(key, id);
        if (request.body.hasOwnProperty('keep')) {
            multi.zadd('entries:kept', +new Date(), id);
        }
    });

    multi.exec(function (err, result) {
        response.send(204);
        return next();
    });
});

server.get('/.*', restify.serveStatic({
  'directory': './public/',
  'default': 'index.html'
}));

server.listen(8080, function() {
  console.log('%s listening at %s', server.name, server.url);
});
