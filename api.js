/*
Copyright [yyyy] [name of copyright owner]

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

var app = require('express')();
var morgan = require('morgan');
var bodyparser = require('body-parser');
var atob = require('atob');
var ProtoBuf = require('protobufjs');
var util = require('./util.js');
//var ByteBuffer = require("bytebuffer");
//var hexy = require('hexy');
var Q = require('q');
var hlc = require('hfc');
var debug = require('debug')('blocks');
var rest = require('rest');
var mime = require('rest/interceptor/mime');
var errorCode = require('rest/interceptor/errorCode');
var restClient = rest.wrap(mime).wrap(errorCode, {code: 400});

var  chainHeight = 0;

// Configure test users
//
// Set the values required to register a user with the certificate authority.
user1 = {
  name: 'WebApp_user1',
  role: 1, // Client
  account: 'bank_a',
  affiliation: '00001'
};

var userMember1;

// Path to the local directory containing the chaincode project under $GOPATH
var chaincodePath = 'github.com/blocks_chaincode/';

// testChaincodeID will store the chaincode ID value after deployment.
// set it to the current value for now so we don't need to do a deploy each run
//var chaincodeID = '3ee9582aca17f49566a46e3f945385571ce778c20a3837790714bd22cb7f2695';
var chaincodeID;

// Initializing values for chaincode parameters
var initA = '100';
var initB = '200';
var deltaAB = '1';

// Create a client chain.
// The name can be anything as it is only used internally.
var chain = hlc.newChain('targetChain');

// Configure the KeyValStore which is used to store sensitive keys
// as so it is important to secure this storage.
// The FileKeyValStore is a simple file-based KeyValStore, but you
// can easily implement your own to store whereever you want.
chain.setKeyValStore(hlc.newFileKeyValStore('./tmp/keyValStore'));
var store = chain.getKeyValStore();
// store.setValue('chaincodeID',
//           '3ee9582aca17f49566a46e3f945385571ce778c20a3837790714bd22cb7f2695',
//           function(err){
//             if(err) console.log('error saving chaincodeid. ' + err);
//           });
store.getValue('chaincodeID', function(err, value) {
  if (err) {
    console.log('error getting chaincodeID ' + err);
  }
  if (value) {
    chaincodeID = value;
  }
});

// load bluemix credentials from file-based
var bluemix = require('./cred-blockchain-of.json');

// URL for the REST interface to the peer
var restUrl = 'http://localhost:5000';
// var restUrl = bluemix.credentials.peers[2].api_url;
// var netId = bluemix.credentials.peers[2].network_id;
//var caUrl = bluemix.credentials.ca.

// Set the URL for member services
chain.setMemberServicesUrl('grpc://localhost:50051');
// TODO add code to look up the ca url from the credentials file.
// chain.setMemberServicesUrl('grpc://ffa1d5bd-8020-45f2-a2af-1f95075613d0_ca.blockchain.ibm.com:30304');
// Add a peer's URL
chain.addPeer('grpc://localhost:30303');

// Enroll "WebAppAdmin" which is already registered because it is
// listed in fabric/membersrvc/membersrvc.yaml with it's one time password.
// If "WebAppAdmin" has already been registered, this will still succeed
// because it stores the state in the KeyValStore
// (i.e. in '/tmp/keyValStore' in this sample).
chain.enroll('WebAppAdmin', 'DJY27pEnl16d', function(err, webAppAdmin) {
  if (err) {
    return console.log('ERROR: failed to register ', err);
  }
  // Successfully enrolled WebAppAdmin during initialization.
  // Set this user as the chain's registrar which is authorized to register other users.
  chain.setRegistrar(webAppAdmin);
  // Now begin listening for web app requests
  //listenForUserRequests();
  var theReg = chain.getRegistrar().getName();
  debug('The registrar is ' + theReg);

  chain.getUser(user1.name, function(err, user) {
    if (err) {
      return console.log('getUser error: ' + err);
    }
    if (user.isEnrolled()) {
      userMember1 = user;
      return;
    }
    // User is not enrolled yet, so perform both registration and enrollment
    var registrationRequest = {
      registrar: 'WebAppAdmin',
      enrollmentID: user1.name,
      account: 'bank_a',
      affiliation: '00001'
    };
    user.registerAndEnroll(registrationRequest, function(err) {
      if (err) {
        return console.log('registerAndEnroll error: ' + err);
      }
      userMember1 = user;
    });
  });
});

app.use(morgan('dev'));
app.use(require('express').static(__dirname + '/public'));
//app.use(require('body-parser').urlencoded({ extended: true }));
app.use(bodyparser.json());

app.get('/', function(req, res) {
  debug('Display basic home page.');

  res.sendfile('./public/menu.html');
});

// provide an endpoint that will deploy the chaincode
app.get('/deploy', function(req, res) {
  // Construct the deploy request
  var deployRequest = {
    // Function to trigger
    fcn: 'init',
    // Arguments to the initializing function
    args: ['a', initA, 'b', initB]
  };

  deployRequest.chaincodePath = chaincodePath;

  // Trigger the deploy transaction
  var deployTx = userMember1.deploy(deployRequest);

  // Print the deploy results
  deployTx.on('complete', function(results) {
    // Deploy request completed successfully
    console.log('eploy results: ' + results);
    // Set the testChaincodeID for subsequent tests
    chaincodeID = results.chaincodeID;
    store.setValue('chaincodeID',
    chaincodeID,
    function(err) {
      if (err) {
        console.log('error saving chaincodeid. ' + err);
      }
    });
    console.log('chaincodeID: ' + chaincodeID);
    debug('Successfully deployed chaincode: request/response ' +
          deployRequest + results);
  });
  deployTx.on('error', function(err) {
    // Deploy request failed
    console.log('there was an error deploying the chaincode ' + err);
    debug('Failed to deploy chaincode: request/error ' + deployRequest + err);
  });
  res.send('Chaincode deployed ' + deployRequest);
});

app.get('/member', function(req, res) {
  //lets call all of the get functions and see what we get
  console.log('user is registered ' + userMember1.isRegistered() +
              ' is enrolled ' + userMember1.isEnrolled());
  debug('getName: ');
  debug(userMember1.getName());
  //debug(JSON.stringify(userMember1.getChain()));

  res.send('userMember1.getChain()');
});

// Provide an endpoint to deliver the user list
app.get('/userList', function(req, res) {
  var queryRequest = {
    // Name (hash) required for query
    chaincodeID: chaincodeID,
    // Function to trigger
    fcn: 'users',
    // Existing state variable to retrieve
    args: []
  };
  // Trigger the query transaction
  userMember1.setTCertBatchSize(1);
  var queryTx = userMember1.query(queryRequest);
  // Print the query results
  queryTx.on('complete', function(results) {
    // Query completed successfully
    console.log(results);
    console.log(results.result);
    console.log('Successfully queried existing chaincode state: value=%s ' +
      results.result.toString());
    var list = JSON.parse(results.result);
    console.log(list);
    res.json(list);
    //res.json(results.result.toString());
  });
  queryTx.on('error', function(err) {
    // Query failed
    debug(err);
    console.log('Failed to query existing chaincode state:  ', err);
    res.send('Error: ' + err);
  });
});

app.post('/addUser', function(req, res) {
  console.log('addUser request body');
  console.log(req.body);
  console.log('name = ' + req.body.name);
  var invokeRequest = {
    chaincodeID: chaincodeID,
    fcn: 'new',
    args: [req.body.name, req.body.amount]
  };
  console.log('the args are... ' + invokeRequest.args);

  // Trigger the invoke transaction
  var invokeTx = userMember1.invoke(invokeRequest);
  // Return the invoke results
  invokeTx.on('submitted', function(results) {
    // Invoke transaction submitted successfully
    console.log('Successfully submitted chaincode invoke transaction: ',
    invokeRequest, results);
    res.json(results);
  });
  invokeTx.on('error', function(err) {
    // Invoke transaction submission failed
    res.send(err);
  });
});

app.post('/transfer', function(req, res) {
  console.log('transfer request body');
  console.log(req.body);
  var invokeRequest = {
    chaincodeID: chaincodeID,
    fcn: 'transfer',
    args: [req.body.fromName, req.body.toName, req.body.amount]
  };
  console.log('the args are... ' + invokeRequest.args);
  // Trigger the invoke transaction
  var invokeTx = userMember1.invoke(invokeRequest);
  // Return the invoke results
  invokeTx.on('submitted', function(results) {
    // Invoke transaction submitted successfully
    console.log('Successfully submitted chaincode invoke transaction: ',
    invokeRequest, results);
    res.json(results);
  });
  invokeTx.on('error', function(err) {
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
    fcn: 'delete',
    args: [req.body.name]
  };
  console.log('the args are... ' + invokeRequest.args);
  // Trigger the invoke transaction
  var invokeTx = userMember1.invoke(invokeRequest);
  // Return the invoke results
  invokeTx.on('submitted', function(results) {
    // Invoke transaction submitted successfully
    console.log('Successfully submitted chaincode invoke transaction: ',
                invokeRequest, results);
    res.json(results);
  });
  invokeTx.on('error', function(err) {
    // Invoke transaction submission failed
    res.send(err);
  });
});

//  Add calls to the fabric rest interface until supportted by the SDK
app.get('/chain', function(req, res) {
  console.log('Display chain stats');
  restClient(restUrl + '/chain/')
  .then(function(response) {
    debug(response.entity);
    chainHeight = response.entity.height;
    res.json(response.entity);
  }, function(response) {
    console.log(response);
    console.log('Error path: There was an error getting the chain_stats:',
                response.status.code, response.entity.Error);
    res.send('Error path: There was an error getting the chain stats.  ' +
              response.entity.Error);
  });
});

app.get('/chain/blocks/:id', function(req, res) {
  console.log('Get a block by ID: ' + req.params.id);
  restClient(restUrl + '/chain/blocks/' + req.params.id)
  .then(function(response) {
    debug(response.entity);
    var block = util.decodeBlock(response.entity);
    res.json(block);
  }, function(response) {
    console.log(response);
    console.log('Error path: There was an error getting the block_stats:',
                response.status.code, response.entity.Error);
    res.send('Error path: There was an error getting the block stats.  ' +
              response.entity.Error);
  });
});

//provide payload details for block with id specified
app.get('/payload/:id', function(req, res) {
  restClient(restUrl + '/chain/blocks/' + req.params.id)
  .then(function(response) {
    if (response.status.code != 200) {
      console.log('There was an error getting the block_stats:',
                  response.status.code);
      res.send('There was an error getting the block stats.  ' +
                response.entity.Error);
    } else {
      debug(response.entity);
      payload = util.decodePayload(response.entity.transactions[0]);
      console.log(payload.chaincodeSpec.ctorMsg);
      res.json(payload);
    }
  }, function(response) {
    console.log(response);
    console.log('Error path: There was an error getting the block_stats:',
                response.status.code, response.entity.Error);
    res.send('Error path: There was an error getting the block stats.  ' +
                response.entity.Error);
  });
});

var getFormattedBlock = function(id) {
  return restClient(restUrl + '/chain/blocks/' + id)
  .then(function(response) {
    var value = response.entity;
    var len = value.transactions.length;
    value = util.decodeBlock(value);
    return {id: id, block: value};
  });
};

var blockList = [];

app.get('/chain/blockList/:id', function(req, res) {
  console.log('build a list of n blocks');

  var promises = [];
  for (var i = chainHeight - 1;
        i >= chainHeight - req.params.id && i > 0;
        i--) {
    promises.push(getFormattedBlock(i));
  }

  Q.all(promises).then(function(values) {
    blockList = values;
    res.json(values);
  }, function(response) {
    console.log(response);
    console.log('just printed response and now doing the res.send...' +
                response.entity.Error);
    res.send(response.entity.Error);
  }).done();
});

app.get('/chain/transactionList/:id', function(req, res) {
  var list = [];
  var len = blockList.length;
  for (var i = 0; i < len; i++) {
    //using both slice and reverse because slice will make a copy of the
    //array before reverse() reverses the order in place.  
    list = list.concat(blockList[i].block.transactions.slice().reverse());
  }
  if (list.length > req.params.id) {
    res.json(list.slice(0, req.params.id));
  } else {
    res.json(list);
  }
});
app.use(function(err, req, res, next) {
  console.log('unhandled error detected: ' + err.message);
  res.type('text/plain');
  res.status(500);
  res.send('500 - server error');
});

app.use(function(req, res) {
  console.log('route not handled');
  res.type('text/plain');
  res.status(404);
  res.send('404 - not found');
});

app.listen(3000, function() {
  console.log('listening on port 3000');
});
