var url = require('url');

module.exports = {
    url: function (inputUrl) {
        var cleaned, parsed, result;

        // pre-parse cleanup
        cleaned = inputUrl.toLowerCase().trim();
        cleaned = unescape(cleaned);

        parsed = url.parse(cleaned, true);

        // discard unwanted fields
        if (parsed.host) {
            delete parsed.host;
        }
        parsed.hash = null;
        parsed.search = null;
        parsed.protocol = null;

        // remove the www subdomain
        if (parsed.hostname) {
            parsed.hostname = parsed.hostname.replace(/^www\./, '');
        }

        // remove selected querystring vars
        Object.keys(parsed.query).forEach(function (key) {
            if (key.indexOf('utm_') === 0 || !parsed.query[key]) {
                delete parsed.query[key];
            }
        });

        // convert back into a string
        result = url.format(parsed);
        result = result.replace(/^\/\//, '');
        result = result.replace(/[=\/]$/, '');
        return result;
    }
};
