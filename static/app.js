var app = angular.module('App', [
    'ngRoute',
    'appControllers',
    'appServices'
]);

app.config(['$routeProvider', function ($routeProvider) {

    
    $routeProvider.when('/page/:page', {
        controller: 'Entries',
        templateUrl: '/entries.html'
    });
    
    $routeProvider.otherwise({
        redirectTo: '/page/1'
    });
}]);

app.config(['$locationProvider', function ($locationProvider) {
    $locationProvider.html5Mode(true);
}]);
