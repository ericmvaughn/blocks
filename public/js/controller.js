var myApp = angular.module('myApp', []);
myApp.controller('AppCtrl', ['$scope', '$http', function($scope, $http){
  console.log("Hello");
  $http.get('./chain').success(function(response){
    console.log('got chain_stats');
    $scope.chainStats = response;
  });
}]);
