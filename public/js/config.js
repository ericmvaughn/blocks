angular.
  module('myApp').
  config(['$locationProvider', '$routeProvider',
    function config($locationProvider, $routeProvider) {
      $locationProvider.hashPrefix('!');

      $routeProvider.
        when('/blockDetails', {
          template: '<block-details></block-details>'
        }).
        when('/blockList', {
          template: '<block-list></block-list>'
        }).
        when('/userList', {
          template: '<user-list></user-list>'
        }).
        when('/chainStats', {
          template: '<chain-stats></chain-stats>'
        }).
        when('/overview', {
          template: '<overview></overview>'
        }).
        when('/transfer', {
          template: '<transfer></transfer>'
        }).
        when('/addUser', {
          template: '<add-user></add-user>'
        }).
        otherwise('/overview');
    }
  ]);
