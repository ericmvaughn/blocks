var app = require('express')();
var morgan = require('morgan');
var atob = require('atob');


app.use(morgan('dev'));
app.use(require('express').static(__dirname + '/public'));

app.get('/', function(req, res){
  console.log('Display basic home page.');

  res.send('./public/menu.html');
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
        console.log('Got the block stats... ', output);
        res.send(output);
        }
  });
});

app.get('/block/:id', function(req, res){
  console.log('Display a list of the blocks');
  ibc.block_stats(req.params.id, function(e, stats){
    if (e != null) {
        console.log('There was an error getting the block_stats:', e);
        res.send('There was an error getting the block stats.  ');
      }
		else {
        console.log('Got the block stats... ', stats);
        res.json(stats);
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
        console.log(stats);
        console.log('payload in ascii encoding is ', stats.transactions[0].payload);
        console.log('payload decoded with atob ', atob(stats.transactions[0].payload));
        res.send('payload length ' + stats.transactions[0].payload.length.toString());
        }
  });
});

app.get('/height', function(req, res){
  console.log('Display the block height to the browser');
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
						options: {quiet: false, tls:false, maxRetry: 1}
					},
					chaincode:{
						zip_url: 'https://github.com/ibm-blockchain/marbles-chaincode/archive/master.zip',
						unzip_dir: 'marbles-chaincode-master/hyperledger/part2',								//subdirectroy name of chaincode after unzipped
						git_url: 'https://github.com/ibm-blockchain/marbles-chaincode/hyperledger/part2',		//GO get http url

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
      //cc.deploy('init', ['99'], {save_path: './cc_summaries', delay_ms: 50000}, cb_deployed);
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
