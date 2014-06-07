var appServices = angular.module('appServices', ['ngResource']);

appServices.factory('List', ['$resource', function ($resource) {
    'use strict';
    return $resource('/list/:name/:segment', {count: '@count', page: '@page', terms: '@terms'}, {
        get:  {
            method: 'GET'
        },
        update: {
            method: 'POST'
        }
    });
}]);
