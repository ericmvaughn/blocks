var debug = require('debug')('blocks');
var ProtoBuf = require('protobufjs');

var builder = ProtoBuf.loadProtoFile(
              './node_modules/hfc/lib/protos/fabric.proto');    // Creates the Builder
var PROTOS = builder.build('protos');                            // Returns just the 'js' namespace if that's all we need
var rest = require('rest');
var mime = require('rest/interceptor/mime');
var errorCode = require('rest/interceptor/errorCode');
var restClient = rest.wrap(mime).wrap(errorCode, {code: 400});
var cred = require('./cred-blockchain-ma.json');
// var cred = require('./cred-local.json');
// jscs:disable requireCamelCaseOrUpperCaseIdentifiers
var restUrl = cred.peers[0].api_url;
// jscs:enable requireCamelCaseOrUpperCaseIdentifiers
var Q = require('q');

var decodePayload = function(transaction) {
  var payload;
  try {
    payload = PROTOS.ChaincodeInvocationSpec.decode64(transaction.payload);
  } catch (e) {
    if (e.decoded) { // Truncated
      console.log('payload was truncated');
      payload = e.decoded;
    } else {  // General error
      console.log('Protobuf decode failed ' + e);
    }
  }
  return payload;
};

var decodeChaincodeID = function(transaction) {
  var id;
  try {
    id = PROTOS.ChaincodeID.decode64(transaction.chaincodeID);
  } catch (e) {
    if (e.decoded) { // Truncated
      console.log('ChaincodeID was truncated');
      id = e.decoded;
    } else {  // General error
      console.log('Protobuf decode failed ' + e);
    }
  }
  return id;
};

var decodeType = function(transaction) {
  var Type = PROTOS.Transaction.Type;
  for (var type in Type) {
    if (Type[type] == transaction.type) {
      return type;
    }
  }
  return transaction.type;
};

var decodeBlock = function(block) {
  var newBlock = block;
  var len = block.transactions.length;
  for (var i = 0; i < len; i++) {
    newBlock.transactions[i].type = decodeType(block.transactions[i]);
    newBlock.transactions[i].chaincodeID =
      decodeChaincodeID(block.transactions[i]);
    newBlock.transactions[i].payload =
      decodePayload(block.transactions[i]);
  }
  return newBlock;
};

var updateChain = function(height) {
  debug('Calling the REST endpoint GET /chain/');
  return restClient(restUrl + '/chain/')
  .then(function(response) {
    debug(response.entity);
    debug('Returning height of ' + response.entity.height);
    return response.entity.height;
  }, function(response) {
    console.log(response);
    console.log('Error path: There was an error getting the chain_stats:',
                response.status.code, response.entity.Error);
  });
};

var getFormattedBlock = function(id) {
  return restClient(restUrl + '/chain/blocks/' + id)
  .then(function(response) {
    var value = response.entity;
    value = decodeBlock(value);
    return {id: id, block: value};
  });
};

var buildBlockList = function(start, end) {
  var promises = [];
  var max = 120;  //maximum number of blocks to request
  for (var i = start; i < end && i < start + max; i++) {
    promises.push(getFormattedBlock(i));
  }
  return Q.all(promises);
};

var blockListChunk = function(inputObj) {
  debug('Getting blocks from ' + inputObj.start + ' to ' + inputObj.end);
  debug('initialValues length is ' + inputObj.list.length);
  var stop = 0;
  if (inputObj.start + inputObj.chunkSize > inputObj.end) {
    stop = inputObj.end;
  } else {
    stop = inputObj.start + inputObj.chunkSize;
  }
  return buildBlockList(inputObj.start, stop)
  .then(function(values) {
    return {start: inputObj.start + inputObj.chunkSize,
            end: inputObj.end,
            chunkSize: inputObj.chunkSize,
            list: inputObj.list.concat(values)};
  });
};

var initialBlockList = function(height) {
  var values = [];
  var promises = [];
  var chunk = 100;
  for (var i = 1; i < height; i = i + chunk) {
    promises.push(blockListChunk);
  }

  var results = Q({start: 1, end: height, chunkSize: chunk, list: values});
  promises.forEach(function(p) {
    results = results.then(p);
  });
  return results.then(function(inputObj) {return inputObj.list;});
};

var calcBalance = function(transaction, result, user, oldBalance) {
  var ctorMsg = transaction.payload.chaincodeSpec.ctorMsg;
  if (result.errorCode || ctorMsg.args.indexOf(user) == -1) {  //check for an error
    return oldBalance;
  }
  switch (ctorMsg.function) {
    case 'init':
      newBalance = ctorMsg.args[ctorMsg.args.indexOf(user) + 1];
      break;
    case 'new':
      newBalance = ctorMsg.args[1];
      break;
    case 'delete':
      newBalance = 0;
      break;
    case 'transfer':
      if (ctorMsg.args.indexOf(user) === 0) {
        newBalance = Number(oldBalance) - Number(ctorMsg.args[2]);
      } else {
        newBalance = Number(oldBalance) + Number(ctorMsg.args[2]);
      }
      break;
    default:
      newBalance = oldBalance;  //don't change anything if the function is unknown
  }
  return newBalance;
};

exports.decodePayload = decodePayload;
exports.decodeChaincodeID = decodeChaincodeID;
exports.decodeType = decodeType;
exports.decodeBlock = decodeBlock;
exports.updateChain = updateChain;
exports.initialBlockList = initialBlockList;
exports.buildBlockList = buildBlockList;
exports.calcBalance = calcBalance;
