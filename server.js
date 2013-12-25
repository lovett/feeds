var world = require('./world');
var restify = require('restify');
var server = restify.createServer();

server.use(restify.queryParser({ mapParams: false }));
server.use(restify.gzipResponse());

server.get('/', restify.serveStatic({
  'directory': './static/',
  'default': 'index.html'
}));

// display elements from from entries:queued
server.get('/entries/', function unreadEntries (request, response, next) {
    var page = Math.abs(parseInt(request.query.page, 10)) || 0;
    var page_size = Math.abs(parseInt(request.query.page_size, 10))  || 10;
    var start = (page - 1) * page_size;
    var end = start + page_size - 1;

    world.client.lrange('entries:queued', start, end, function (err, ids) {
        var multi = world.client.multi();

        ids.forEach(function (id) {
            multi.hgetall('entry:' + id, function (err, entry) {
                return entry;
            });
        });

        multi.exec(function (err, entries) {
            response.send(entries);
        });
    });
    return next();
});

// move an element from entries:queued to entries:read
server.post('/entries/read', function readEntry (request, response, next) {
    return next();
});

server.listen(8080, function() {
  console.log('%s listening at %s', server.name, server.url);
});
