var myApp = angular.module('myApp', []);
myApp.controller('chainCtrl', ['$scope', '$http', function($scope, $http){
  console.log("Chain Controller");
  $http.get('./chain').success(function(response){
    console.log('got chain_stats');
    $scope.chainStats = response;
  });
}]);
myApp.controller('heightCtrl', ['$scope', '$http', '$interval', function($scope, $http, $interval) {
  console.log("Height Controller");
  getHeight();
  var stopUpdate = $interval(function(){
    getHeight();
  },1000);
  function getHeight(){
    $http.get('./chain').success(function(response){
      //console.log('got chain_stats');
      $scope.height = response.height;
      });
    };
    // Copied from the Angular documentation
    // listen on DOM destroy (removal) event, and cancel the next UI update
   // to prevent updating time after the DOM element was removed.
   $scope.$on('$destroy', function() {
     $interval.cancel(stopUpdates);
   });
}]);
