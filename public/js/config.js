angular.
  module('myApp').
  config(['$locationProvider', '$routeProvider',
    function config($locationProvider, $routeProvider) {
      $locationProvider.hashPrefix('!');

      $routeProvider.
        when('/blockExplorer', {
          template: '<block-explorer></block-explorer>'
        }).
        when('/exampleApp', {
          template: '<example-app></example-app>'
        }).
        when('/blockDetails', {
          template: '<block-details></block-details>'
        }).
        when('/blockList', {
          template: '<block-list></block-list>'
        }).
        when('/transactionList', {
          template: '<transaction-list></transaction-list>'
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
        when('/verifyBalance', {
          template: '<verify-balance></verify-balance>'
        }).
        when('/delUser', {
          template: '<del-user></del-user>'
        }).
        otherwise('/overview');
    }
  ]);
