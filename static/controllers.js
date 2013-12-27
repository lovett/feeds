var appControllers = angular.module('appControllers', []);

appControllers.controller('Entries', ['$scope', '$routeParams', '$route', 'Entry', function ($scope, $routeParams, $route, Entry) {
    Entry.query({page: $routeParams.page}, function (response) {
        for (var key in response) {
            if (key.substr(0, 1) === '$') {
                continue;
            }
            
            if (!isNaN(response[key])) {
                value = parseInt(response[key], 10);
            } else {
                value = response[key];
            }
            
            $scope[key] = value;
        };

        $scope.entries.map(function (entry) {
            var temp;
            entry.title = entry.title || entry.reddit_title;
            entry.date = entry.date || entry.reddit_date;
            temp = document.createElement('a');
            temp.href = entry.url;
            entry.domain = temp.hostname;

            if (temp.hostname.substring(0, 4) == 'www.') {
                entry.domain = entry.domain.substring(4);
            }
        });

    });

    $scope.forget = function () {
        var ids = $scope.entries.map(function (entry) {
            return entry.id;
        });

        Entry.forget(ids, function (data) {
            $route.reload();
        });
        
    };

    $scope.remember = function (id) {
        Entry.remember(id);
        
    };
    
}]);
