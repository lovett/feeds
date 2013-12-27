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
        
        favorite: {
            method: 'POST',
            url: '/entries/favorite'
        },
        
        unfavorite: {
            method: 'POST',
            url: '/entries/unfavorite'
        },
        
    });
}]);
