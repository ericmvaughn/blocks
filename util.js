var ProtoBuf = require('protobufjs');

var builder = ProtoBuf.loadProtoFile(
              './node_modules/hfc/lib/protos/fabric.proto');    // Creates the Builder
var PROTOS = builder.build('protos');                            // Returns just the 'js' namespace if that's all we need

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

exports.decodePayload = decodePayload;
exports.decodeChaincodeID = decodeChaincodeID;
exports.decodeType = decodeType;
exports.decodeBlock = decodeBlock;
