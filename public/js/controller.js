var myApp = angular.module('myApp', ['ngRoute']);

//var baseUrl = 'http://localhost:5000';
var baseUrl = '.';

myApp.controller('chainCtrl', ['$scope', '$http', '$window',
  function($scope, $http, $window) {
  console.log('Chain Controller');
  $http.get(baseUrl + '/chain').then(function(response) {
    console.log('got chain_stats');
    $scope.chainStats = response.data;
  }, function(response) {
    $window.alert(response.data);
  });
}]).directive('chainStats', function() {
  return {
    controller: 'chainCtrl',
    templateUrl: 'templates/chainStats.html'
  };
});

myApp.controller('heightCtrl', ['$scope', '$http', '$interval',
function($scope, $http, $interval) {
  console.log('Height Controller');
  getHeight();
  var stopUpdate = $interval(function() {
    getHeight();
  }, 60000);
  function getHeight() {
    $http.get(baseUrl + '/chain').success(function(response) {
      //console.log('got chain_stats');
      $scope.height = response.height;
    });
  }
  // Copied from the Angular documentation
  // listen on DOM destroy (removal) event, and cancel the next UI update
  // to prevent updating time after the DOM element was removed.
  $scope.$on('$destroy', function() {
    $interval.cancel(stopUpdates);
  });
}]);

myApp.controller('transactionListCtrl', ['$scope', '$http',
    function($scope, $http) {
  console.log('Get the last 20 transactions');
  $scope.transactionList = [];
  $http.get(baseUrl + '/chain/transactionList/20000')
  .success(function(response) {
    $scope.transactionList = response;
  });
  $scope.popup = function(index) {
    $scope.popupTransaction = $scope.transactionList[index];
  };
}]).directive('transactionList', function() {
  return {
    controller: 'transactionListCtrl',
    templateUrl: 'templates/transactionList.html'
  };
});

myApp.controller('blockListCtrl', ['$scope', '$http', function($scope, $http) {
  console.log('Get the last 20 blocks');
  $scope.blockList = [];
  $http.get(baseUrl + '/chain/blockList/20000').success(function(response) {
    $scope.blockList = response;
  });
  $scope.popup = function(index) {
    $scope.popupBlock = $scope.blockList[index].block;
  };
}]).directive('blockList', function() {
  return {
    controller: 'blockListCtrl',
    templateUrl: 'templates/blockList.html'
  };
});

myApp.controller('blockCtrl', ['$scope', '$http', function($scope, $http) {
  $http.get(baseUrl + '/chain').success(function(response) {
    $scope.blockID = response.height - 1;
    getBlock($scope.blockID);
  });
  console.log('The blockID is ' + $scope.blockID);

  $scope.change = function() {
    var id = $scope.blockID;
    console.log('Get a block based on the blockID/' + id);
    getBlock($scope.blockID);
  };
  function getBlock(id) {
    $http.get(baseUrl + '/chain/blocks/' + id).success(function(response) {
      //console.log("print with JSON.stringify");
      $scope.block = response;
      //$scope.block = angular.toJson(response, 4);
    });
    $http.get(baseUrl + '/payload/' + id).success(function(response) {
      $scope.payload = angular.toJson(response, 4);
    });
  }
}]).directive('blockDetails', function() {
  return {
    controller: 'blockCtrl',
    templateUrl: 'templates/blockDetails.html'
  };
});

myApp.controller('userListCtrl', ['$scope', '$http', function($scope, $http) {
  console.log('calling the userList endpoint');

  $scope.update = function() {
    //clear out old alerts
    $scope.showAlert = false;
    $scope.alertMsg = '';

    $http.get(baseUrl + '/userList').then(function(response) {
      console.log(response.data);
      $scope.userList = angular.fromJson(response.data);
      console.log(Object.keys($scope.userList));
      $scope.selectedUser = Object.keys($scope.userList)[0];
      $scope.selectUser($scope.selectedUser);
    }, function(response) {
      console.log('an error happened on getting the user list');
      console.log(response.data);
      $scope.showErrorAlert = true;
      $scope.alertErrorMsg = response.data;
    });
  };
  $scope.update();  //running this function to populate the list on the initial load

  $scope.selectUser = function(user) {
    //console.log(user + ' selected');
    $scope.selectedUser = user;
    if (user) {
      $http.get(baseUrl + '/userHistory/' + user).then(function(response) {
        $scope.userHistory = angular.fromJson(response.data);
      }, function(error) {
        console.log('Error getting the user history');
        console.log(error);
      });
    } else {
      $scope.userHistory = [];
    }
  };
  $scope.popup = function(index) {
    $scope.popupTransaction = $scope.userHistory[index];
  };
}]).directive('userList', function() {
  return {
    controller: 'userListCtrl',
    templateUrl: 'templates/userList.html'
  };
});

myApp.directive('transactionAlerts', function() {
  return {
    templateUrl: 'templates/transactionAlerts.html'
  };
});

myApp.directive('overview', function() {
  return {
    templateUrl: 'templates/overview.html'
  };
});

myApp.directive('blockExplorer', function() {
  return {
    templateUrl: 'templates/blockExplorer.html'
  };
});

myApp.directive('exampleApp', function() {
  return {
    templateUrl: 'templates/exampleApp.html'
  };
});

myApp.controller('addUserCtrl', ['$scope', '$http', function($scope, $http) {
  $scope.submit = function() {
    var data = {
      'name': $scope.newUser,
      'amount': $scope.amount
    };
    // clear out the input data -- not sure if this is the correct way
    //  Let's leave the user input visable to how that looks
    // $scope.newUser = '';
    // $scope.amount = '';
    // But let's clear the old alert measages
    $scope.showAlert = false;
    $scope.alertMsg = '';
    $scope.showErrorAlert = false;
    $scope.showErrorMsg = '';

    $http.post(baseUrl + '/addUser', data).then(function(response) {
      console.log('response from the addUser post ');
      console.log(response);
      if (response.data) {
        console.log(response.data);
        $scope.showAlert = true;
        $scope.alertMsg = response.data;
      }
    }, function(response) {
      console.log('an error happened on the $http.post');
      console.log(response.data);
      $scope.showErrorAlert = true;
      $scope.alertErrorMsg = response.data;
    });
  };
}]).directive('addUser', function() {
  return {
    controller: 'addUserCtrl',
    templateUrl: 'templates/addUser.html'
  };
});

myApp.controller('verifyBalanceCtrl',
  ['$scope', '$http', function($scope, $http) {
  $scope.submit = function() {
    var data = {
      'name': $scope.user,
      'balance': $scope.balance
    };
    // clear the old alert measages before posting a new request
    $scope.showAlert = false;
    $scope.alertMsg = '';
    $scope.showErrorAlert = false;
    $scope.showErrorMsg = '';

    $http.post(baseUrl + '/verifyBalance', data).then(function(response) {
      console.log('response from the verifyBalance post ');
      console.log(response);
      if (response.data) {
        $scope.result = response.data;
        $scope.showAlert = true;
        $scope.alertMsg = response.data;
      }
    }, function(response) {
      console.log('an error happened on the $http.post');
      console.log(response.data);
      $scope.showErrorAlert = true;
      $scope.alertErrorMsg = response.data;
    });
  };
}]).directive('verifyBalance', function() {
  return {
    controller: 'verifyBalanceCtrl',
    templateUrl: 'templates/verifyBalance.html'
  };
});

myApp.controller('delUserCtrl', ['$scope', '$http', function($scope, $http) {
  $scope.submit = function() {
    var data = {
      'name': $scope.delUser
    };
    // clear out the input data -- not sure if this is the correct way
    //$scope.delUser = '';
    // clear the old alert measages before posting a new request
    $scope.showAlert = false;
    $scope.alertMsg = '';
    $scope.showErrorAlert = false;
    $scope.showErrorMsg = '';

    $http.post(baseUrl + '/delUser', data).then(function(response) {
      console.log('response from the delUser post ');
      console.log(response);
      if (response.data) {
        console.log(response.data);
        $scope.showAlert = true;
        $scope.alertMsg = response.data;
      }
    }, function(response) {
      console.log('an error happened on the $http.post');
      console.log(response.data);
      $scope.showErrorAlert = true;
      $scope.alertErrorMsg = response.data;
    });
  };
}]).directive('delUser', function() {
  return {
    controller: 'delUserCtrl',
    templateUrl: 'templates/delUser.html'
  };
});

myApp.controller('transferCtrl', ['$scope', '$http', function($scope, $http) {
  $scope.submit = function() {
    var data = {
      'fromName': $scope.fromUser,
      'toName': $scope.toUser,
      'amount': $scope.amount
    };
    // clear out the input data -- not sure if this is the correct way
    // $scope.fromUser = '';
    // $scope.toUser = '';
    // $scope.amount = '';
    // clear the old alert measages before posting a new request
    $scope.showAlert = false;
    $scope.alertMsg = '';
    $scope.showErrorAlert = false;
    $scope.showErrorMsg = '';

    $http.post(baseUrl + '/transfer', data).then(function(response) {
      console.log('response from the transfer post ');
      console.log(response);
      if (response.data) {
        console.log(response.data);
        $scope.showAlert = true;
        $scope.alertMsg = response.data;
      }
    }, function(response) {
      console.log('an error happened on the $http.post');
      console.log(response.data);
      $scope.showErrorAlert = true;
      $scope.alertErrorMsg = response.data;
    });
  };
}]).directive('transfer', function() {
  return {
    controller: 'transferCtrl',
    templateUrl: 'templates/transfer.html'
  };
});
