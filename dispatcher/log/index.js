var bunyan = require('bunyan');

var logger = bunyan.createLogger({
    name: 'headlines',
    serializers: {
        redis: function (err) {
            var firstMessage = err.shift().message.replace('Error: ', '');
            console.error(firstMessage);
            return firstMessage;
        }
    },
    streams: [
        {
            path: process.env.HEADLINES_LOG,
            level: process.env.HEADLINES_LOG_LEVEL
        }
    ]
});
    


module.exports = function (level, fields, message) {
    logger[level](fields, message);
};
