var appServices = angular.module('appServices', ['ngResource']);

appServices.factory('Entry', ['$resource', function ($resource) {
    return $resource('/entries', {}, {
        query: {
            method: 'GET',
            params:{
                page: '@page'
            }
        },
        forget: {
            method: 'POST',
            url: '/entries/forget'
        },
        remember: {
            method: 'POST',
            url: '/entries/remember'
        }
        
    });
}]);
