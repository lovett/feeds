var crypto = require('crypto');

module.exports = function (key) {
    key = key.toLowerCase();
    var sha = crypto.createHash('sha1');
    sha.update(key, 'utf8');
    return sha.digest('hex');
}
