var appControllers = angular.module('appControllers', []);


appControllers.controller('SearchController', ['$rootScope', '$scope', function ($rootScope, $scope) {
    'use strict';
    $scope.search = function () {
        return false;
    };

}]);

appControllers.controller('FeedController', ['$rootScope', '$scope', '$route', 'List', function ($rootScope, $scope, $route, List) {
    'use strict';
    $rootScope.listName = 'feeds';

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

    $scope.sortBy = function (field) {
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
    };

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
        });
    };

    $scope.remove = function () {
        var feedId = this.feed.id;
        List.update({name: 'feeds'}, {
            unsubscribe: feedId
        }, populate);
    };
}]);

appControllers.controller('ListController', ['$rootScope', '$scope', '$routeParams', '$route', 'List', function ($rootScope, $scope, $routeParams, $route, List) {
    'use strict';

    if (!$routeParams.name) {
        return;
    }

    var screenSize = $('#screen-size SPAN:visible').attr('class');
    screenSize = screenSize.replace(/^show-for-([a-z]+)-only/, '$1');

    var numEntries;
    if (screenSize === 'small') {
        numEntries = 5;
    } else if (screenSize === 'medium') {
        numEntries = 9;
    } else {
        numEntries = 12;
    }

    List.get({'name': $routeParams.name, page: $routeParams.page, size: numEntries}, function (response) {
        var key, value;
        for (key in response) {
            if (response.hasOwnProperty(key)) {
                if (key.substr(0, 1) === '$') {
                    continue;
                }

                if (typeof response[key] === 'number') {
                    value = parseInt(response[key], 10);
                } else {
                    value = response[key];
                }

                $scope[key] = value;
            }
        }

        $scope.entries.map(function (entry) {
            var temp;
            temp = document.createElement('a');
            temp.href = entry.url;
            entry.domain = temp.hostname;

            if (temp.hostname.substring(0, 4) === 'www.') {
                entry.domain = entry.domain.substring(4);
            }

            if ($routeParams.name === 'kept') {
                entry.state = 'kept';
            }
        });

        $rootScope.listSize = $scope.listSize;
        $rootScope.entryCount = $scope.entries.length;
        $rootScope.keptCount = 0;

    });

    $rootScope.listName = $routeParams.name;

    if ($routeParams.name === 'unread') {
        $scope.unreadList = true;
    } else if ($routeParams.name === 'kept') {
        $scope.keptList = true;
    }


    $rootScope.setEntryState = function (newState, entry) {
        var ids, listName, listSegment;

        if (newState === 'kept') {
            listName = 'kept';
            listSegment = 'additions';
        } else if (newState === 'discarded') {
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

            $rootScope.entryCount -= ids.length;

            if (newState === 'kept') {
                $rootScope.keptCount += ids.length;
            }

            if ($rootScope.entryCount < 1) {
                $route.reload();
            }

        });
    };

}]);
