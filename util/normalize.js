const url = require('url');

/**
 * Cleanup functions for bringing consistency to erratic values.
*/
module.exports = {
    /**
     * A normalized URL drops things that would throw off equality
     * comparisons, such as case sensitivity, link protocol, and www
     * subdomain.
     *
     * Normalized URLs should not be used as replacements. They are
     * only for comparison.
     */
    url: function (inputUrl) {
        var cleaned, parsedUrl, result;

        // pre-parse cleanup
        cleaned = inputUrl.toLowerCase().trim();
        cleaned = unescape(cleaned);

        parsedUrl = url.parse(cleaned, true, true);

        // discard unwanted fields
        if (parsedUrl.host) {
            delete parsedUrl.host;
        }

        if (parsedUrl.hash === '#') {
            delete parsedUrl.hash;
        }

        delete parsedUrl.protocol;

        // remove the www subdomain
        if (parsedUrl.hostname) {
            parsedUrl.hostname = parsedUrl.hostname.replace(/^www\./, '');
        }

        // remove selected querystring vars
        Object.keys(parsedUrl.query).forEach(function (key) {
            if (key.indexOf('utm_') === 0 || !parsedUrl.query[key]) {
                delete parsedUrl.query[key];
            }
        });

        // convert back into a string
        result = url.format(parsedUrl);
        result = result.replace(/^\/\//, '');
        result = result.replace(/[=\/]$/, '');
        return result;
    }
};
