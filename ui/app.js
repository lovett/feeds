var app = angular.module('App', [
    'ngRoute',
    'appControllers',
    'appServices',
]);

app.config(['$routeProvider', function ($routeProvider) {
    'use strict';

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
    $locationProvider.html5Mode({
        enabled: true,
        requireBase: false
    });
}]);

app.config(['$httpProvider', function ($httpProvider) {
    'use strict';
    $httpProvider.interceptors.push('HttpInterceptService');
}]);

app.filter('reldate', function () {
    'use strict';
    return function (when) {
        var d;

        if (when instanceof Date) {
            // this avoids clobbering the original value
            d = new Date(when.getTime());
        } else {
            d = new Date(parseInt(d, 10));
        }

        var now = new Date();

        // roll back to midnight
        d.setHours(0,0,0,0);
        now.setHours(0,0,0,0);

        var delta = (now - d) / 86400 / 1000;

        if (delta === -1) {
            return 'tomorrow';
        } else if (delta === 0) {
            return 'today';
        } else if (delta === 1) {
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
        link: function (scope, element) {
            element.bind('change', function () {
                var fileList = element[0].files;
                if (fileList) {
                    scope.fileUpload({files: fileList});
                }
                angular.element(element[0]).val(null);
            });
        }
    };
});
