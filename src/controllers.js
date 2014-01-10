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

appControllers.controller('ListController', ['$scope', '$routeParams', '$route', 'List', function ($scope, $routeParams, $route, List) {

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
            entry.title = entry.title || entry.reddit_title || entry.hn_title;
            entry.date = entry.date || entry.reddit_date || entry.hn_date;
            temp = document.createElement('a');
            temp.href = entry.url;
            entry.domain = temp.hostname;

            if (temp.hostname.substring(0, 4) == 'www.') {
                entry.domain = entry.domain.substring(4);
            }
        });

    });

    $scope.list_name = $routeParams.name;
    if ($routeParams.name === 'queued') {
        $scope.queued_list = true;
    } else if ($routeParams.name === 'kept') {
        $scope.kept_list = true;
    }
        

    $scope.discard = function (entry) {
        var ids;
        if (!angular.isDefined(entry)) {
            ids = $scope.entries.map(function (entry) {
                return entry.id;
            });
        } else {
            ids = [entry.id];
        }

        List.discard({'name': $routeParams.name, ids: ids}, function (data) {
            $route.reload();
        });
        
    };

    $scope.keep = function (entry) {
        List.keep({'keep': 1, 'name': $routeParams.name, ids: [entry.id]}, function (data) {
            entry.kept = 1;
        });
    };
    
}]);
