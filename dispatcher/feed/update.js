var keymap = require('../../util/keymap');

module.exports = function (feedId, values) {
    var callbacks = {};
    
    this.insist('log:info', values, 'updating feed' );

    callbacks.error = function (err) {
        this.insist('log:error', {err: err}, 'unable to update feed url');
    };

    this.insist('redis', 'hmset', keymap.feedKey(feedId), values, callbacks.error.bind(this));
};
