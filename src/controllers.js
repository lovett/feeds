var appControllers = angular.module('appControllers', []);


appControllers.controller('SearchController', ['$rootScope', '$scope', '$route', function ($rootScope, $scope, $route) {
    $scope.search = function (query) {
        alert(query.terms);
    };

}]);

appControllers.controller('FeedController', ['$rootScope', '$scope', '$route', 'List', function ($rootScope, $scope, $route, List) {
    $rootScope.list_name = 'feeds';

    $scope.sortField = null;
    $scope.sortDirection = null;

    List.get({'name': 'feeds'}, function (response) {
        $scope.feeds = response.feeds;
        $scope.sortBy('name');
    });


    $scope.sortBy = function (field, direction) {
        if (field !== $scope.sortField) {
            $scope.sortField = field;
            $scope.sortDirection = 'asc';
        } else {
            $scope.sortDirection = ($scope.sortDirection === 'asc')? 'desc':'asc';
        }


        $scope.feeds = _.sortBy($scope.feeds, function (feed) {
            return feed[$scope.sortField];
        });

        if ($scope.sortDirection === 'desc') {
            $scope.feeds = $scope.feeds.reverse();
        }
    }

    $scope.add = function (feed) {

        if ($scope.newFeedForm.$invalid) {
            $scope.newFeedForm.submitted = true;
            return;
        }

        List.add({name: 'feeds'}, {
            url: feed.url,
            name: feed.name
        }, function (response) {
            _.forEach(response, function (feed) {
                $scope.feeds[feed.id] = feed;
                $scope.feedCount++;
                $scope.feed = {};
                $scope.newFeedForm.submitted = false;
            });
        }, function (err) {
        });
    };

    $scope.remove = function () {
        var feed_id = this.feed.id;
        List.update({
            'name': 'feeds',
            'remove': feed_id
        }, function (resp) {
            $scope.feeds = _.reject($scope.feeds, function (feed) {
                return feed.id === feed_id;
            });
        }, function (err) {
        });
    };
}]);

appControllers.controller('ListController', ['$rootScope', '$scope', '$routeParams', '$route', 'List', function ($rootScope, $scope, $routeParams, $route, List) {
    if (!$routeParams.name) {
        return;
    }
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

            if (temp.hostname.substring(0, 4) == 'www.') {
                entry.domain = entry.domain.substring(4);
            }
        });

        $rootScope.list_size = $scope.list_size;
        $rootScope.entry_count = $scope.entries.length;
        $rootScope.kept_count = 0;

    });

    $rootScope.list_name = $routeParams.name;

    if ($routeParams.name === 'queued') {
        $scope.queued_list = true;
    } else if ($routeParams.name === 'kept') {
        $scope.kept_list = true;
    }


    $rootScope.setEntryState = function (state, entry) {
        var ids;
        if (angular.isDefined(entry)) {
            ids = [entry.id];
        } else {
            ids = $scope.entries.reduce(function (current, entry) {
                if (entry.state !== 'kept') {
                    current.push(entry.id);
                }
                return current;
            }, []);

        }

        List.update({'keep': (state === 'kept'), 'name': $routeParams.name, ids: ids}, function (data) {
            _.forEach($scope.entries, function (entry) {
                if (data.ids.indexOf(entry.id) > -1) {
                    entry.state = state;
                }
            });

            $rootScope.entry_count -= ids.length;

            if (state === 'kept') {
                $rootScope.kept_count += ids.length;
            }

            if ($rootScope.entry_count < 1) {
                $route.reload();
            }

        });



    };

    $rootScope.refresh = function () {
        $route.reload();
    };

}]);
