var app = angular.module('App', [
    'ngRoute',
    'appControllers',
    'appServices',
    'angularMoment'
]);

app.config(['$routeProvider', function ($routeProvider) {
    'use strict';

    moment.lang('en', {
        calendar : {
            lastDay : '[yesterday at] LT',
            sameDay : '[today at] LT',
            nextDay : '[tomorrow at] LT',
            lastWeek : 'dddd [at] LT',
            nextWeek : '[next] dddd [at] LT',
            sameElse : 'L'
        }
    });

    $routeProvider.when('/feeds', {
        controller: 'FeedController',
        templateUrl: '/feeds.html'
    });

    $routeProvider.when('/search/:terms', {
        controller: 'SearchController',
        templateUrl: '/entries.html'
    });

    $routeProvider.when('/entries/:name/:page?', {
        controller: 'ListController',
        templateUrl: '/entries.html'
    });

    $routeProvider.otherwise({
        redirectTo: '/entries/unread/'
    });
}]);

app.config(['$locationProvider', function ($locationProvider) {
    'use strict';
    $locationProvider.html5Mode(true);
}]);


app.run(function () {
    'use strict';
    $(document).foundation();
});
