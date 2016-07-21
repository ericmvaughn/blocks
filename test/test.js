var assert = require('chai').assert;
var util = require('../util.js');
var validBlock = require('./valid-block.json');

describe('ProtoBuf', function() {
  describe('decodePayload', function() {
    it('should fail if run with invalid block input', function() {
      var block = '';
      var payload = util.decodePayload(block);
      assert.isUndefined(payload);
      });

    it('should decode the payload', function() {
      var block = require('./valid-block.json');
      var payload = util.decodePayload(block);
      assert.isObject(payload, 'decoded payload is an object');
      assert.isDefined(payload.chaincodeSpec, 'payload should contain chaincodeSpec');
      assert.equal(payload.chaincodeSpec.ctorMsg.function, 'transfer', 'the function should be transfer');
    })
  });
  //test the decodeChaincodeID function
  describe('decodeChaincodeID', function() {
    it('should decode and return the chaincode ID', function() {
      var id = util.decodeChaincodeID(validBlock);
      assert.isDefined(id);
      assert.property(id, 'name', 'should contain a name');
      assert.isString(id.name, 'the chaincodeID name should be a string');
      assert.isAtLeast(id.name.length, 1, 'the chaincodeID should have a name');
    });
  });
  describe('decodeType', function() {
    it('should return the transaction type', function() {
      var type = util.decodeType(validBlock);
      assert.isDefined(type);
      assert.oneOf(type, ['CHAINCODE_DEPLOY', 'CHAINCODE_INVOKE', 'CHAINCODE_QUERY', 'CHAINCODE_TERMINATE']);
    });
  });
});
