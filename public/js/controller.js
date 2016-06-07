var myApp = angular.module('myApp', []);

var baseUrl = 'http://localhost:5000';
//var baseUrl = '.';

myApp.controller('chainCtrl', ['$scope', '$http', function($scope, $http){
  console.log("Chain Controller");
  $http.get(baseUrl + '/chain').success(function(response){
    console.log('got chain_stats');
    $scope.chainStats = response;
  });
}]);
myApp.controller('heightCtrl', ['$scope', '$http', '$interval', function($scope, $http, $interval) {
  console.log("Height Controller");
  getHeight();
  var stopUpdate = $interval(function(){
    getHeight();
  },10000);
  function getHeight(){
    $http.get(baseUrl + '/chain').success(function(response){
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

myApp.controller('blocksCtrl', ['$scope', '$http', function($scope, $http){
  console.log("Get the last 10 blocks");
  $http.get(baseUrl + '/chain/blocks/10').success(function(response){
    console.log(response);
    $scope.blocks = response;
  });
}]);

myApp.controller('blockCtrl', ['$scope', '$http', function($scope, $http){
  $http.get(baseUrl + '/chain').success(function(response){
    $scope.blockID = response.height - 1;
    getBlock($scope.blockID);
    });


  $scope.change = function() {
    var id = $scope.blockID;
    console.log("Get a block based on the blockID/" + id);
    getBlock($scope.blockID);
  };
  function getBlock(id){
    $http.get(baseUrl + '/chain/blocks/' + id).success(function(response){
      //console.log("print with JSON.stringify");
      //$scope.block = JSON.stringify(response, null, 4);
      $scope.block = angular.toJson(response, 4);
    });
  };

}]);
