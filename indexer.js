var world = require("./world");
var redis = require("redis");
var subscriber = redis.createClient();
var htmlparser = require("htmlparser2");
var fs = require("fs");
var S = require("string");
var elasticsearch = require('elasticsearch');

var search_client = new elasticsearch.Client({
    host: 'localhost:9200',
    log: 'trace'
});

subscriber.on("subscribe", function (channel, count) {
    world.logger.info("Subscribed to " + channel);
});

subscriber.on("message", function (channel, id) {
    var key = "entry:" + id;
    
    world.client.hgetall(key, function (err, entry) {
        var hash = world.archiveHash(entry.url);
        var path = world.archivePath(hash);
        var html = fs.readFileSync(path, {encoding: 'utf-8'})
        var page_text = '';
        var current_tag;
        
        var parser = new htmlparser.Parser({
            lowerCaseTags: true,
            onopentag: function(name, attribs) {
                current_tag = name;
            },
            ontext: function(text) {
                if (current_tag == 'script') return;
                if (current_tag == 'style') return;
                page_text += text;
            },
            onend: function () {
                var doc = {
                    index: 'headlines',
                    type: 'entry',
                    id: hash,
                    body: {
                        entry_id: id,
                        title: entry.title
                    }
                };

                doc.body.page_text = S(page_text).collapseWhitespace().decodeHTMLEntities().s

                search_client.index(doc, function (err, response, status) {
                    console.log(response);
                    console.log(status);
                })
            }
        });

        parser.parseComplete(html);
    });
    
});

subscriber.subscribe("entry:index");
