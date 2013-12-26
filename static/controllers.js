var appControllers = angular.module('appControllers', []);

appControllers.controller('Entries', ['$scope', '$routeParams', 'Entry', function ($scope, $routeParams, Entry) {
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
            temp = document.createElement('a');
            temp.href = entry.url;
            entry.domain = temp.hostname;
        });

        console.log($scope.entries[0]);
    });
}]);
