var app = require('express')();
var morgan = require('morgan');
var bodyparser = require('body-parser');
var atob = require('atob');
var ProtoBuf = require("protobufjs");
var ByteBuffer = require("bytebuffer");
var hexy = require('hexy');
var Q = require('q');
// Add the code to connect to the IBM blockchain
var Ibc1 = require('ibm-blockchain-js');
var ibc = new Ibc1();

app.use(morgan('dev'));
app.use(require('express').static(__dirname + '/public'));
//app.use(require('body-parser').urlencoded({ extended: true }));
app.use(bodyparser.json());

app.get('/', function(req, res){
  console.log('Display basic home page.');

  res.sendfile('./public/menu.html');
});

app.get('/chain', function(req, res){
  console.log('Display chain stats');
  ibc.chain_stats( function(e, stats){
    if (e != null) {
        console.log('There was an error getting the chain_stats:', e);
        res.send('There was an error getting the chain stats.  ');
      }
		else {
        console.log('Got the block stats... ');
        res.json(stats);
        }
  });
});

app.get('/chain/blocks/:id', function(req, res){
  console.log('Display a list of the blocks');
  ibc.block_stats(req.params.id, function(e, stats){
    if (e != null) {
        console.log('There was an error getting the block_stats:', e);
        res.send('There was an error getting the block stats.  ');
      }
		else {
        console.log('Got the block stats... ');
        stats.transactions[0].type = decodeType(stats);
        stats.transactions[0].payload = decodePayload(stats);
        stats.transactions[0].chaincodeID = decodeChaincodeID(stats);
        res.json(stats);
        }
  });
});

// Provide an endpoint to deliver the user list
app.get('/userList', function(req, res) {
  chaincode.query.users([], function(e, data) {
    console.log('errror is ' + e);
    console.log('data is ' + data);
    res.json(data);
  });
});

app.post('/addUser', function(req, res) {
  console.log('addUser request body');
  console.log(req.body);
  console.log('name = ' + req.body.name);
  var args = [req.body.name, req.body.amount];
  console.log('the args are... ' + args);
  chaincode.invoke.new(args, function(err, data){
         console.log('add user response:', data, err);
         if (err != null) {
           res.send(err);
         } else {
           res.json(data.message);
         }
     });
});

app.post('/delUser', function(req, res) {
  console.log('delUser request body');
  console.log(req.body);
  console.log('name = ' + req.body.name);
  var args = [req.body.name];
  console.log('the args are... ' + args);
  chaincode.invoke.delete(args, function(err, data){
         console.log('delete user response:', data, err);
         if (err != null) {
           res.send(err);
         } else {
           res.json(data.message);
         }
     });
});


app.post('/transfer', function(req, res) {
  console.log('transfer request body');
  console.log(req.body);
  console.log('name = ' + req.body.name);
  var args = [req.body.fromName, req.body.toName, req.body.amount];
  var args1 = [req.body.fromName, req.body.toName+'10', req.body.amount];
  console.log('the args are... ' + args);
  chaincode.invoke.transfer(args1, function(err, data){});
  chaincode.invoke.transfer(args, function(err, data){
         console.log('transfer response:', data, err);
         if (err != null) {
           res.send(err);
         } else {
           res.json(data.message);
         }
     });
});



//provide payload details for block with id specified

app.get('/payload/:id', function(req, res){
  console.log('Display the payload for block id...');
  ibc.block_stats(req.params.id, function(e, stats){
    if (e != null) {
        console.log('There was an error getting the block_stats:', e);
        res.send('There was an error getting the block stats.  ');
      }
		else {
        // var data = atob(stats.transactions[0].payload);
        // console.log('test hexy on the payload');
        // console.log(hexy.hexy(data, hexyFormat));

        payload = decodePayload(stats);

        console.log(payload.chaincodeSpec.ctorMsg);
        res.json(payload);
        }
  });
});

app.get('/height', function(req, res){
  //console.log('Display the block height to the browser');
  res.send(chainHeight.toString());
});


var getBlock = Q.nfbind(ibc.block_stats);
var getFormattedBlock = function(id){
  return getBlock(id).then(function(value){
    value.transactions[0].type = decodeType(value);
    value.transactions[0].payload = decodePayload(value);
    value.transactions[0].chaincodeID = decodeChaincodeID(value);
    return {id: id, block: value};
  });
};

app.get('/chain/blockList/:id', function(req, res){
  console.log('build a list of n blocks');
  //TODO  add some protection so i doesn't go negative
  var blockList = [];
  var promises = [];

  for (var i = chainHeight - 1; i >= chainHeight - req.params.id && i > 0; i--){
    promises.push(getFormattedBlock(i));
  }

  Q.all(promises).then(function(values){
    res.json(values);
  }, function(e){
    console.log(e);
    res.send(e);
  }).done();
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


var builder = ProtoBuf.loadProtoFile("./node_modules/hlc-experimental/protos/fabric.proto"),    // Creates the Builder
    PROTOS = builder.build("protos");                            // Returns just the 'js' namespace if that's all we need

var hexyFormat = {};
    hexyFormat.width = 16; // how many bytes per line, default 16
    hexyFormat.format = "twos";


var decodePayload = function(block){
  try {
    var payload = PROTOS.ChaincodeInvocationSpec.decode64(block.transactions[0].payload);
  } catch (e) {
    if (e.decoded) { // Truncated
      console.log('payload was truncated');
       payload = e.decoded;
     } else {  // General error
       console.log('Protobuf decode failed ' + e);
     }
  };
  return payload;
};

var decodeChaincodeID = function(block){
  try {
    var id = PROTOS.ChaincodeID.decode64(block.transactions[0].chaincodeID);
  } catch (e) {
    if (e.decoded) { // Truncated
      console.log('ChaincodeID was truncated');
       id = e.decoded;
     } else {  // General error
       console.log('Protobuf decode failed ' + e);
     }
  };
  return id;
};

var decodeType = function(block){
  var Type = PROTOS.Transaction.Type;
  for (type in Type){
    if (Type[type] == block.transactions[0].type) {
      return type;
    }
  }
  return block.transactions[0].type;
};



// ==================================
// load peers manually or from VCAP, VCAP will overwrite hardcoded list!
// ==================================

// inserting the credentials for my blockchain from a seperate file
// var manual = require('./credentials.json');
// using a credentials file for the vagrant/docker blockchain
var manual = require('./cred_local.json');

var peers = manual.credentials.peers;
console.log('loading hardcoded peers');
var users = null;																		//users are only found if security is on
if(manual.credentials.users) users = manual.credentials.users;
console.log('loading hardcoded users');

// ==================================
// configure ibm-blockchain-js sdk
// ==================================
var options = 	{
					network:{
						peers: peers,
						users: users,
						options: {quiet: true, tls:false, maxRetry: 1}
					},
					chaincode:{
						// zip_url: 'https://github.com/ibm-blockchain/marbles-chaincode/archive/master.zip',
						// unzip_dir: 'marbles-chaincode-master/hyperledger/part2',								//subdirectroy name of chaincode after unzipped
						// git_url: 'https://github.com/ibm-blockchain/marbles-chaincode/hyperledger/part2',		//GO get http url
             zip_url: 'https://github.com/ericmvaughn/blocks_chaincode/archive/master.zip',    //zip location
						 unzip_dir: 'blocks_chaincode-master',								//subdirectroy name of chaincode after unzipped
             git_url: 'https://github.com/ericmvaughn/blocks_chaincode',  //git location

            //  deployed_name: '72e79caf6fb193a4cf6f5b80fb4e1d4895f6bc7de244623efd4914dff25dd8a875d6483ef624e8a01c8669895be0bc00b47ebf4cea7c887c5c4117fbcba78ca9'
            // deployed_name: '3964883de0dab04297d0b777dbf9eec09f113b542ca9e6b09d82385637aa64006fd816af80cf171c5ba0f9026301a048b2f25c9dd90538b635f3708f0325e942'
					  // deployed_name: '2a18b2fc6e88ba7ae110ac9a694324ef715cf661fc8baad8d452e40132ded0db6840e4d91957ef48a7abc73c382e0e4e3121123abea9c6a6676c61796a65a87a'
            //deployed_name: '2b85cc800210da0bcf331babede4399aa7f898e3353eb6d093b3fb367162fd6784ca0b70742939ad2fcb1cd983caec055ae5a46449dc58fa760e87cf863a1c72'
            deployed_name: '48546babebfabfda47cc19d68fb94f0896a449864bed657ff1e5896c3b01c93c82d55e2f64f7b55490f127b1998d7e09e9a9cd246cd425cf723dee991b82227f'
          }
				};

ibc.load(options, cb_ready);																//parse/load chaincode

var chaincode = null;
function cb_ready(err, cc){																	//response has chaincode functions
	if(err != null){
		console.log('! looks like an error loading the chaincode or network, app will fail\n', err);
		if(!process.error) process.error = {type: 'load', msg: err.details};				//if it already exist, keep the last error
	}
	else{
		chaincode = cc;
		if(!cc.details.deployed_name || cc.details.deployed_name === ''){					//decide if i need to deploy
			//  once the first deploy has been done the deployed_name needs to be
      //  set to the cc ID in the options structure.  There must be a better
      //  way to do this.
      cc.deploy('init', ['a','101','b','200'], {save_path: './cc_summaries', delay_ms: 50000}, cb_deployed);
		}
		else{
			console.log('chaincode summary file indicates chaincode has been previously deployed');
			cb_deployed();
		}
	}
};

function cb_deployed(e, d){
	if(e != null){
		//look at tutorial_part1.md in the trouble shooting section for help
		console.log('! looks like a deploy error, holding off on the starting the socket\n', e);
		if(!process.error) process.error = {type: 'deploy', msg: e.details};
	}
	else{
		console.log('...just did the deploy so lets see the new cc details... ');
		console.log(chaincode.details);
  }
};

// note the chain height that is returned in the chain_stats and
// monitor_blockheight functions is actually 1 greater than the id of the
// last block on the chain.  However, I think the chain starts with block id 1
var chainHeight = 0;
ibc.chain_stats(function(e, stats){
  if(e != null) console.log('error getting chain stats: ', e);
  else{
    console.log('got the chain stats and the height is: ', stats.height);
    chainHeight = stats.height;
  }
});

//  It turns out the doc is incorrect and the callback for monitor_blockheight
//  only returns the stats and doesn't return an error.
ibc.monitor_blockheight(function(stats){
  if(stats == null){
    console.log('Error getting stats from monitor_blockheight');
  }
  else {
    console.log('got the chain stats from monitor_blockheight and the height is: ', stats.height);
    chainHeight = stats.height;
  }
})
