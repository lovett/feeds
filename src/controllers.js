var appControllers = angular.module('appControllers', []);

appControllers.controller('FeedController', ['$scope', '$route', 'List', function ($scope, $route, List) {
    List.get({'name': 'feeds'}, function (response) {
        $scope.feeds = response.feeds;
    });

    $scope.add = function () {
        List.add({
            'name': 'feeds',
            add: {url:$scope.url, name: $scope.name}
        });
        $route.reload();
    };

    $scope.remove = function () {
        List.discard({
            'name': 'feeds',
            remove: this.feed.url
        });
        $route.reload();
    };
}]);

appControllers.controller('ListController', ['$rootScope', '$scope', '$routeParams', '$route', 'List', function ($rootScope, $scope, $routeParams, $route, List) {

    List.get({'name': $routeParams.name, page: $routeParams.page}, function (response) {
        for (var key in response) {
            if (key.substr(0, 1) === '$') {
                continue;
            }

            if (typeof response[key] === 'number') {
                value = parseInt(response[key], 10);
            } else {
                value = response[key];
            }

            $scope[key] = value;
        };

        $scope.entries.map(function (entry) {
            var temp;
            temp = document.createElement('a');
            temp.href = entry.url;
            entry.domain = temp.hostname;
            entry.discarded = false;
            entry.kept = false;

            if (temp.hostname.substring(0, 4) == 'www.') {
                entry.domain = entry.domain.substring(4);
            }
        });

        $rootScope.unhandled_entries = $scope.entries.length;

    });

    $scope.list_name = $routeParams.name;

    if ($routeParams.name === 'queued') {
        $scope.queued_list = true;
    } else if ($routeParams.name === 'kept') {
        $scope.kept_list = true;
    }


    $rootScope.discard = function (entry) {
        var ids;
        if (angular.isDefined(entry)) {
            ids = [entry.id];
        } else {
            ids = $scope.entries.map(function (entry) {
                return entry.id;
            });
        }

        List.discard({'name': $routeParams.name, ids: ids}, function (data) {
            if (ids.length == 1) {
                entry.discarded = true;
            } else {
                _.forEach($scope.entries, function (entry) {
                    entry.discarded = true;
                });
                $rootScope.unhandled_entries -= ids.length;
            }
        });

    };

    $rootScope.keep = function (entry) {
        List.keep({'keep': 1, 'name': $routeParams.name, ids: [entry.id]}, function (data) {
            entry.kept = 1;
            $rootScope.unhandled_entries--;
        });
    };

    $rootScope.refresh = function () {
        $route.reload();
    };

}]);
