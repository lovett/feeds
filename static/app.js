var app = angular.module('App', [
    'ngRoute',
    'appControllers',
    'appServices',
    'angularMoment'
]);

app.config(['$routeProvider', function ($routeProvider) {
    $routeProvider.when('/feeds', {
        controller: 'FeedController',
        templateUrl: '/feeds.html'
    });
    
    $routeProvider.when('/entries/:name/:page', {
        controller: 'ListController',
        templateUrl: '/entries.html'
    });
    
    $routeProvider.otherwise({
        redirectTo: '/entries/queued/1'
    });
}]);

app.config(['$locationProvider', function ($locationProvider) {
    $locationProvider.html5Mode(true);
}]);
