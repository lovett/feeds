module.exports = {
    url: function (url) {
        var norm = url.toLowerCase().trim();
        
        // convert escaped characters
        norm = unescape(norm)
        
        // remove the scheme
        norm = norm.replace(/^[a-z]+:\/\//, '');
        
        // remove the www subdomain
        norm = norm.replace(/^www\./, '');
        
        // remove the querystring
        norm = norm.replace(/\?.*/, '')
        
        // remove the trailing slash
        norm = norm.replace(/\/$/, '')
        
        return norm;
    }
};
