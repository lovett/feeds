var appServices = angular.module('appServices', ['ngResource']);

appServices.factory('List', ['$resource', function ($resource) {
    return $resource('/list/:name', {name: '@name', page: '@page'}, {
        get:  {
            method: 'GET'
        },
        add: {
            method: 'POST'
        },
        discard: {
            method: 'POST'
        },
        keep: {
            method: 'POST',
        }
    });
}]);
