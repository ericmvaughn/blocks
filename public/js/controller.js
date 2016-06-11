var myApp = angular.module('myApp', []);

//var baseUrl = 'http://localhost:5000';
var baseUrl = '.';

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
  },60000);
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

myApp.controller('blockListCtrl', ['$scope', '$http', function($scope, $http){
  console.log("Get the last 10 blocks");
  var chainHeight = 0;
  $http.get(baseUrl + '/chain').success(function(response){
    //console.log('got chain_stats');
    chainHeight = response.height;

    $scope.blockList = [];
    for (var i = chainHeight - 1; i >= chainHeight - 10; i--){

      $http.get(baseUrl + '/chain/blocks/' + i).success(function(response){
        //console.log(response);
        $scope.blockList.push(response);
        });
      };
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

    $http.get(baseUrl + '/payload/' + id).success(function(response){
      $scope.payload = angular.toJson(response, 4);

    });
  };

}]);

myApp.controller('userListCtrl', ['$scope', '$http', function($scope, $http){
  console.log('calling the userList endpoint');

  $scope.update = function(){
    $http.get(baseUrl + '/userList').then(function(response){
      $scope.userList = angular.fromJson(response.data);
      }, function(response){
        console.log('an error happened on getting the user list')
      });
  };
  $scope.update();  //running this function to populate the list on the initial load
}]);

//Method for going direectly to the blockchain
// myApp.controller('userListCtrl', ['$scope', '$http', function($scope, $http){
//   console.log('getting ready to do the $http.post');
// // Two questions here... How should we get the chaincode name and the
// // user name for the secureContext?  just hardcoding them for now.
//   var data = {
//           "jsonrpc": "2.0",
//           "method": "query",
//           "params": {
//             "type": 1,
//             "chaincodeID":{
//                 "name":"0d11fe625e76a89edf373681f4706cbd6a8573501a29cf39149309076aa68ee9a776abb49ae3eace35ebb9ad46925f2e2a4063867c730748d3a645aa99b2c125"
//             },
//             "ctorMsg": {
//                "function":"users",
//                "args":[]
//             },
//           "secureContext": "dashboarduser_type0_9ffe26021d"
//           },
//       "id": 5
//       };
//   $http.post(baseUrl + '/chaincode', data).then(function(response){
//     console.log(response);
//     if(response.data.result != null){
//       $scope.userList = angular.fromJson(response.data.result.message);
//     };
//   }, function(response){
//     console.log('an error happened on the $http.post')
//   });
// }]);
