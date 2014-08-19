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

    $routeProvider.when('/login', {
        controller: 'LoginController',
        templateUrl: '/login.html'
    });

    $routeProvider.when('/signup', {
        controller: 'SignupController',
        templateUrl: '/signup.html'
    });


    $routeProvider.when('/logout', {
        controller: 'LogoutController',
        templateUrl: '/logout.html',
    });

    $routeProvider.otherwise({
        redirectTo: '/entries/unread/'
    });
}]);

app.config(['$locationProvider', function ($locationProvider) {
    'use strict';
    $locationProvider.html5Mode(true);
}]);

app.config(['$httpProvider', function ($httpProvider) {
    'use strict';
    $httpProvider.interceptors.push('HttpInterceptService');
}]);

app.filter('reldate', function () {
    'use strict';
    return function (when) {
        var d = when;
        if (!(d instanceof Date)) {
            d = new Date(parseInt(d, 10));
        }

        var now = new Date();

        // roll back to midnight
        d.setHours(0,0,0,0);
        now.setHours(0,0,0,0);

        var delta = (now - d) / 86400 / 1000;

        if (delta == -1) {
            return 'tomorrow';
        } else if (delta == 0) {
            return 'today';
        } else if (delta == 1) {
            return 'yesterday';
        } else {
            return when;
        }
    };
});

app.directive('fileUpload', function () {
    'use strict';
    
    return {
        restrict: 'A',
        scope: { fileUpload: '&' },
        template: '<input type="file" />',
        replace: true,
        link: function (scope, element, attributes) {
            element.bind('change', function () {
                var fileList = element[0].files;
                if (fileList) {
                    scope.fileUpload({files: fileList});
                }
            });
        }
    }
});

app.run(function () {
    'use strict';
    $(document).foundation();
});

