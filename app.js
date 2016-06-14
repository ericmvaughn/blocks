var app = require('express')();
var morgan = require('morgan');
var bodyparser = require('body-parser');
var atob = require('atob');
var ProtoBuf = require("protobufjs");
var ByteBuffer = require("bytebuffer");
var hexy = require('hexy');

var builder = ProtoBuf.loadProtoFile("./node_modules/hlc-experimental/protos/fabric.proto"),    // Creates the Builder
    PROTOS = builder.build("protos");                            // Returns just the 'js' namespace if that's all we need

var hexyFormat = {};
    hexyFormat.width = 16; // how many bytes per line, default 16
    hexyFormat.format = "twos";


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
        var output = JSON.stringify(stats, null, 4);
        // console.log('Got the block stats... ', output);
        console.log('Got the block stats... ');
        res.send(output);
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
        // console.log('Got the block stats... ', stats);
        console.log('Got the block stats... ');
        payload = decodePayload(stats);
        stats.transactions[0].payload = payload;
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

app.get('/all/blocks', function(req, res){
  console.log('build a list of all of the blocks');
  var html = '<h1>Block Details </h1>'
  for (var i = chainHeight - 1; i > 0; i--){
    //html += '<p > Block id: ' + i + '</p>';
    ibc.block_stats(i, function(e, stats){
      if (e != null) {
          console.log('There was an error getting the block_stats:', e);
          res.send('There was an error getting the block stats.  ');
        }
  		else {
          var ccid = stats.transactions[0].chaincodeID;
          var payload = stats.transactions[0].payload;

          //html += '<p > Block id: ' + i + '</p>';  // this doesn't work because i = the end point of the for loop by the time the callback happens
          //html += '<p>Created: &nbsp;' + formatDate(blocks[id].blockstats.transactions[0].timestamp.seconds * 1000, '%M-%d-%Y %I:%m%p') + ' UTC</p>';
          html += '<p> transaction count ' + stats.transactions.length + '</p>';
          html += '<p> UUID: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;' + stats.transactions[0].uuid.toString() + '</p>';
          html += '<p> Type:  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;' + stats.transactions[0].type.toString() + '</p>';
          html += '<p> CC ID:  &nbsp;&nbsp;&nbsp;&nbsp;' + atob(ccid).toString() + '</p>';
          html += '<p> Payload length:  &nbsp;' + payload.length.toString() + '</p>';
          html += '<p> &nbsp; </p>';
          //console.log(html);
          }
    });
  }
  setTimeout(function(){  //Added this delay to give the block_stats callbacks to complete
    res.send(html);
  }, 1000);
});


app.get('/chain/blockList/:id', function(req, res){
  console.log('build a list of n blocks');
  //TODO  add some protection so i doesn't go negative
  var blockList = [];
  for (var i = chainHeight - 1; i >= chainHeight - req.params.id; i--){

    ibc.block_stats(i, function(e, stats){
      if (e != null) {
          console.log('There was an error getting the block_stats:', e);
          res.send('There was an error getting the block stats.  ');
        }
  		else {
          //console.log('Adding another block to the list...');
          blockList.push(stats);
          }
    });
  }
  setTimeout(function(){  //Added this delay to give the block_stats callbacks to complete
    res.json(blockList);
  }, 1000);
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



// Add the code to connect to the IBM blockchain
var Ibc1 = require('ibm-blockchain-js');
var ibc = new Ibc1();

// ==================================
// load peers manually or from VCAP, VCAP will overwrite hardcoded list!
// ==================================

// inserting the credentials for my blockchain from a seperate file
var manual = require('./credentials.json');


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
			//emv  adding prints to see if deploy really needs to be called
			console.log('printing out the chaincode details to see if it really needs to be deployed  ');
			console.log(cc.details);
			//  What happens if we donn't deploy each time we starting
      console.log('not going to deploy this time...');
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
