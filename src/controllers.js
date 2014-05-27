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

    var populate = function (response) {
        $scope.feeds = [];
        _.forEach(response.feeds, function (values, key) {
            values.id = key;
            $scope.feeds.push(values);
        });
        $scope.sortBy('name', 'asc');
    };        

    List.get({'name': 'feeds'}, populate);

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

        List.update({name: 'feeds'}, {
            subscribe: {
                url: feed.url,
                name: feed.name
            }
        }, function (response) {
            populate(response);
            $scope.newFeedForm.submitted = false;
        }, function (err) {
        });
    };

    $scope.remove = function () {
        var feed_id = this.feed.id;
        console.log(feed_id);
        List.update({name: 'feeds'}, {
            unsubscribe: feed_id
        }, populate, function (err) {
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

            if ($routeParams.name === 'kept') {
                entry.state = 'kept';
            }
        });

        $rootScope.list_size = $scope.list_size;
        $rootScope.entry_count = $scope.entries.length;
        $rootScope.kept_count = 0;

    });

    $rootScope.list_name = $routeParams.name;

    if ($routeParams.name === 'unread') {
        $scope.unread_list = true;
    } else if ($routeParams.name === 'kept') {
        $scope.kept_list = true;
    }


    $rootScope.setEntryState = function (newState, entry) {
        var ids, listName, listSegment;

        if (newState == 'kept') {
            listName = 'kept';
            listSegment = 'additions';
        } else if (newState == 'discarded') {
            listName = $routeParams.name;
            listSegment = 'removals';
        }

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

        List.update({name: listName, segment: listSegment}, {ids: ids}, function (data) {
            _.forEach($scope.entries, function (entry) {
                if (data.ids.indexOf(entry.id) > -1) {
                    entry.state = newState;
                }
            });

            $rootScope.entry_count -= ids.length;

            if (newState === 'kept') {
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
