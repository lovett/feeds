var world = require('./world');
var restify = require('restify');
var fs = require('fs');
var server = restify.createServer();

server.use(restify.queryParser({ mapParams: false }));
server.use(restify.gzipResponse());
server.use(restify.bodyParser({ mapParams: false }));

// display elements from from entries:queued
server.get('/entries/', function unreadEntries (request, response, next) {
    var page = Math.abs(request.query.page) || 1;
    var page_size = Math.min(Math.abs(request.query.page_size) || 10, 50);
    var start = (page - 1) * page_size;
    var end = start + page_size - 1;

    world.client.zrange('entries:queued', start, end, function (err, ids) {
        var multi = world.client.multi();

        // total entries
        multi.zcard('entries:queued', function (err, result) {
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

// add entries to entries:read
server.post('/entries/forget', function (request, response, next) {
    var multi = world.client.multi();
    
    request.body.forEach(function (id) {
        multi.zrem('entries:queued', id);
        multi.zadd('entries:read', +new Date(), id);
    });

    multi.exec(function (err, result) {
        response.send(204);
        return next();
    });
});

// add entries to entries:favorite
server.post('/entries/favorite', function (request, response, next) {
    var multi = world.client.multi();

    if (typeof request.body !== 'array') {
        request.body = [request.body];
    }

    request.body.forEach(function (id) {
        multi.zadd('entries:favorite', +new Date(), id);
    });

    multi.exec(function (err, result) {
        response.send(204);
        return next();
    });
});

// remove entries from entries:favorite
server.post('/entries/unfavorite', function (request, response, next) {
    var multi = world.client.multi();

    request.body.forEach(function (id) {
        multi.zrem('entries:favorite', id);
    });

    multi.exec(function (err, result) {
        response.send(204);
        return next();
    });
}); 

server.get('/page/.*', function indexHTML(req, res, next) {
    fs.readFile(__dirname + '/static/index.html', function (err, data) {
        if (err) {
            next(err);
            return;
        }
        
        res.setHeader('Content-Type', 'text/html');
        res.writeHead(200);
        res.end(data);
        next();    
    });
});
    
server.get('/.*', restify.serveStatic({
  'directory': './static/',
  'default': 'index.html'
}));

server.listen(8080, function() {
  console.log('%s listening at %s', server.name, server.url);
});

