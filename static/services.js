var appServices = angular.module('appServices', ['ngResource']);

appServices.factory('Entry', ['$resource', function ($resource) {
    return $resource('/entries', {}, {
        query: {
            method:'GET',
            params:{
                page: '@page'
            }
        }
    });
}]);
