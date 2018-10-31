module.exports = function (level, params) {
    const message = Object.assign(params, {
        timestamp: new Date(),
        level,
    });

    console.log(JSON.stringify(message));
};
