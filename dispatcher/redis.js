var redis = require('redis');
var redisClient = redis.createClient();

module.exports = function (command, args, callback) {
    var localCallback = function (err, response) {
        if (err) {
            this.insist('log:error', err);
            return;
        }

        if (callback) {
            callback(response);
        }
    };

    if (command === 'multi') {
        redisClient.multi(args).exec(localCallback.bind(this));
    } else {
        redisClient[command](args, localCallback.bind(this));
    }
};
