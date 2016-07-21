var ProtoBuf = require('protobufjs');

var builder = ProtoBuf.loadProtoFile(
              './node_modules/hfc/lib/protos/fabric.proto');    // Creates the Builder
var PROTOS = builder.build('protos');                            // Returns just the 'js' namespace if that's all we need

var decodePayload = function(block) {
  var payload;
  try {
    payload = PROTOS.ChaincodeInvocationSpec.decode64(
                                              block.transactions[0].payload);
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

var decodeChaincodeID = function(block) {
  var id;
  try {
    id = PROTOS.ChaincodeID.decode64(block.transactions[0].chaincodeID);
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

var decodeType = function(block) {
  var Type = PROTOS.Transaction.Type;
  for (var type in Type) {
    if (Type[type] == block.transactions[0].type) {
      return type;
    }
  }
  return block.transactions[0].type;
};

exports.decodePayload = decodePayload;
exports.decodeChaincodeID = decodeChaincodeID;
exports.decodeType = decodeType;
