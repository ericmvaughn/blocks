var app = require('express')();
var morgan = require('morgan');
var bodyparser = require('body-parser');
var atob = require('atob');
var ProtoBuf = require("protobufjs");
//var ByteBuffer = require("bytebuffer");
var hexy = require('hexy');
var Q = require('q');
var hlc = require('hfc');
var debug = require('debug')('blocks');


// Configure test users
//
// Set the values required to register a user with the certificate authority.
//

user1 = {
    name: "WebApp_user1",
    role: 1, // Client
    account: "bank_a",
    affiliation: "00001"
};

var user_Member1;

// Path to the local directory containing the chaincode project under $GOPATH
var chaincodePath = "github.com/blocks_chaincode/";

// testChaincodeID will store the chaincode ID value after deployment.
// set it to the current value for now so we don't need to do a deploy each run
var chaincodeID = '3ee9582aca17f49566a46e3f945385571ce778c20a3837790714bd22cb7f2695';

// Initializing values for chaincode parameters
var initA = "100";
var initB = "200";
var deltaAB = "1";


/**
 * This example shows how to do the following in a web app.
 * 1) At initialization time, enroll the web app with the block chain.
 *    The identity must have already been registered.
 * 2) At run time, after a user has authenticated with the web app:
 *    a) register and enroll an identity for the user;
 *    b) use this identity to deploy, query, and invoke a chaincode.
 */


// Create a client chain.
// The name can be anything as it is only used internally.
var chain = hlc.newChain("targetChain");

// Configure the KeyValStore which is used to store sensitive keys
// as so it is important to secure this storage.
// The FileKeyValStore is a simple file-based KeyValStore, but you
// can easily implement your own to store whereever you want.
chain.setKeyValStore( hlc.newFileKeyValStore('/tmp/keyValStore') );

// Set the URL for member services
chain.setMemberServicesUrl("grpc://localhost:50051");

// Add a peer's URL
chain.addPeer("grpc://localhost:30303");

// Enroll "WebAppAdmin" which is already registered because it is
// listed in fabric/membersrvc/membersrvc.yaml with it's one time password.
// If "WebAppAdmin" has already been registered, this will still succeed
// because it stores the state in the KeyValStore
// (i.e. in '/tmp/keyValStore' in this sample).
chain.enroll("WebAppAdmin", "DJY27pEnl16d", function(err, webAppAdmin) {
   if (err) return console.log("ERROR: failed to register %s: %s",err);
   // Successfully enrolled WebAppAdmin during initialization.
   // Set this user as the chain's registrar which is authorized to register other users.
   chain.setRegistrar(webAppAdmin);
   // Now begin listening for web app requests
   //listenForUserRequests();
   var theReg = chain.getRegistrar().getName();
   debug('The registrar is ' + theReg);

    chain.getUser(user1.name, function (err, user) {
        if (err) return console.log('getUser error: ' + err);
        if (user.isEnrolled()) {
          user_Member1 = user;
          return;
        }
        // User is not enrolled yet, so perform both registration and enrollment
        var registrationRequest = {
            registrar: "WebAppAdmin",
            enrollmentID: user1.name,
            account: "bank_a",
            affiliation: "00001"
        };
        user.registerAndEnroll(registrationRequest, function (err) {
            if (err) return console.log('registerAndEnroll error: ' + err);
            user_Member1 = user;
        });
    });
});


app.use(morgan('dev'));
app.use(require('express').static(__dirname + '/public'));
//app.use(require('body-parser').urlencoded({ extended: true }));
app.use(bodyparser.json());

app.get('/', function(req, res){
  debug('Display basic home page.');

  res.sendfile('./public/menu.html');
});

// provide an endpoint that will deploy the chaincode
app.get('/deploy', function(req, res) {
      // Construct the deploy request
    var deployRequest = {
      // Function to trigger
      fcn: "init",
      // Arguments to the initializing function
      args: ["a", initA, "b", initB]
      };

    deployRequest.chaincodePath = chaincodePath;

    // Trigger the deploy transaction
    var deployTx = user_Member1.deploy(deployRequest);

    // Print the deploy results
    deployTx.on('complete', function(results) {
      // Deploy request completed successfully
      console.log("deploy results: " + results);
      // Set the testChaincodeID for subsequent tests
      chaincodeID = results.chaincodeID;
      console.log("chaincodeID: " + chaincodeID);
      debug("Successfully deployed chaincode: request/response " + deployRequest + results);
    });
    deployTx.on('error', function(err) {
      // Deploy request failed
      console.log('there was an error deploying the chaincode ' + err);
      debug("Failed to deploy chaincode: request/error " + deployRequest + err);
    });
    res.send('Chaincode deployed ' + deployRequest);
});


app.get('/member', function(req, res) {
  //lets call all of the get functions and see what we get
  console.log('user is registered ' + user_Member1.isRegistered() + ' is enrolled ' + user_Member1.isEnrolled());
  debug('getName: ');
  debug(user_Member1.getName());
  //debug(JSON.stringify(user_Member1.getChain()));

  res.send("user_Member1.getChain()");
});


// Provide an endpoint to deliver the user list
app.get('/userList', function(req, res) {

  var queryRequest = {
      // Name (hash) required for query
      chaincodeID: chaincodeID,
      // Function to trigger
      fcn: "users",
      // Existing state variable to retrieve
      args: []
  };
  // temporarily set chaincodeID if not set
//  if (queryRequest.chaincodeID == null)  queryRequest.chaincodeID = '3ee9582aca17f49566a46e3f945385571ce778c20a3837790714bd22cb7f2695';
  // Trigger the query transaction
  user_Member1.setTCertBatchSize(1);
  var queryTx = user_Member1.query(queryRequest);

  // Print the query results
  queryTx.on('complete', function (results) {
      // Query completed successfully
      console.log(results);
      console.log(results.results);
      console.log("Successfully queried existing chaincode state: value=%s " + results.result.toString());
      res.json(results.result.toString());
  });
  queryTx.on('error', function (err) {
      // Query failed
      console.log("Failed to query existing chaincode state: error= " + err);
      res.send('Error: ' + err);
  });

});

app.post('/addUser', function(req, res) {
  console.log('addUser request body');
  console.log(req.body);
  console.log('name = ' + req.body.name);
  var invokeRequest = {
    chaincodeID: chaincodeID,
    fcn: "new",
    args: [req.body.name, req.body.amount]
  };
  console.log('the args are... ' + invokeRequest.args);
  // temporarily set chaincodeID if not set
  //if (queryRequest.chaincodeID == null)  queryRequest.chaincodeID = '3ee9582aca17f49566a46e3f945385571ce778c20a3837790714bd22cb7f2695';
  // Trigger the invoke transaction
  var invokeTx = user_Member1.invoke(invokeRequest);
  // Return the invoke results
  invokeTx.on('submitted', function (results) {
      // Invoke transaction submitted successfully
      console.log("Successfully submitted chaincode invoke transaction: ", invokeRequest, results);
      res.json(results)
  });
  invokeTx.on('error', function (err) {
      // Invoke transaction submission failed
      res.send(err);
  });
});

app.post('/transfer', function(req, res) {
  console.log('transfer request body');
  console.log(req.body);
  var invokeRequest = {
    chaincodeID: chaincodeID,
    fcn: "transfer",
    args: [req.body.fromName, req.body.toName, req.body.amount]
  };
  console.log('the args are... ' + invokeRequest.args);
  // Trigger the invoke transaction
  var invokeTx = user_Member1.invoke(invokeRequest);
  // Return the invoke results
  invokeTx.on('submitted', function (results) {
      // Invoke transaction submitted successfully
      console.log("Successfully submitted chaincode invoke transaction: ", invokeRequest, results);
      res.json(results)
  });
  invokeTx.on('error', function (err) {
      // Invoke transaction submission failed
      res.send(err);
  });
});

app.post('/delUser', function(req, res) {
  console.log('transfer request body');
  console.log(req.body);
  console.log('name = ' + req.body.name);
  var invokeRequest = {
    chaincodeID: chaincodeID,
    fcn: "delete",
    args: [req.body.name]
  };
  console.log('the args are... ' + invokeRequest.args);
  // Trigger the invoke transaction
  var invokeTx = user_Member1.invoke(invokeRequest);
  // Return the invoke results
  invokeTx.on('submitted', function (results) {
      // Invoke transaction submitted successfully
      console.log("Successfully submitted chaincode invoke transaction: ", invokeRequest, results);
      res.json(results)
  });
  invokeTx.on('error', function (err) {
      // Invoke transaction submission failed
      res.send(err);
  });
});



app.use(function(err, req, res, next){
  console.log('unhandled error detected: ' + err.message);
  res.send('500 - server error');
});
app.use(function(req, res){
  console.log('route not handled');
  res.send('404 - not found');
});

app.listen(3000, function(){
  console.log('listening on port 3000');
});










// Main web app function to listen for and handle requests
function listenForUserRequests() {
   for (;;) {
      // WebApp-specific logic goes here to await the next request.
      // ...
      // Assume that we received a request from an authenticated user
      // 'userName', and determined that we need to invoke the chaincode
      // with 'chaincodeID' and function named 'fcn' with arguments 'args'.
      handleUserRequest(userName,chaincodeID,fcn,args);
   }
}

// Handle a user request
function handleUserRequest(userName, chaincodeID, fcn, args) {
   // Register and enroll this user.
   // If this user has already been registered and/or enrolled, this will
   // still succeed because the state is kept in the KeyValStore
   // (i.e. in '/tmp/keyValStore' in this sample).
   var registrationRequest = {
        enrollmentID: userName,
        // Customize account & affiliation
        account: "bank_a",
        affiliation: "00001"
   };
   chain.registerAndEnroll( registrationRequest, function(err, user) {
      if (err) return console.log("ERROR: %s",err);
      // Issue an invoke request
      var invokeRequest = {
        // Name (hash) required for invoke
        chaincodeID: chaincodeID,
        // Function to trigger
        fcn: fcn,
        // Parameters for the invoke function
        args: args
     };
     // Invoke the request from the user object.
     var tx = user.invoke(invokeRequest);
     // Listen for the 'submitted' event
     tx.on('submitted', function(results) {
        console.log("submitted invoke: %j",results);
     });
     // Listen for the 'complete' event.
     tx.on('complete', function(results) {
        console.log("completed invoke: %j",results);
     });
     // Listen for the 'error' event.
     tx.on('error', function(err) {
        console.log("error on invoke: %j",err);
     });
   });
}
