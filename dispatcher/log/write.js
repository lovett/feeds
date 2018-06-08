module.exports = function (args) {
    const level = args.shift();
    const event = args.shift();

    const record = JSON.stringify({
        'event': event,
        'args': args
    });


    console[level](record);
};
