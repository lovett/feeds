#!/bin/bash

#
# Wipe out Redis and then seed it with some sample data
#

SERVER=http://localhost:8081/list/feeds

redis-cli flushdb

curl -X PUT -H 'Content-Type: application/json;charset=UTF-8' -d '[{"url":"http://www.reddit.com/r/programming/.rss","name":"Reddit Programming"},
{"url":"https://news.ycombinator.com/rss","name":"Hacker News"},
{"url":"http://rss.slashdot.org/Slashdot/slashdot","name":"Slashdot"},
{"url":"http://feeds.nytimes.com/nyt/rss/Technology","name":"NYTimes Technology"}]' $SERVER

#node manager.js fetch
