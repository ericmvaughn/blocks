var assert = require('chai').assert;
var request =require('superagent');
var util = require('../util.js');
var validBlock = require('./valid-block.json');
var transactions = require('./transactions.json').transactions;
var url = 'http://localhost:3000';

describe('ProtoBuf', function() {
  describe('decodePayload', function() {
    it('should fail if run with invalid transaction input', function() {
      var transaction = '';
      var payload = util.decodePayload(transaction);
      assert.isUndefined(payload);
      });

    it('should decode the payload', function() {
      var payload = util.decodePayload(validBlock.transactions[0]);
      assert.isObject(payload, 'decoded payload is an object');
      assert.isDefined(payload.chaincodeSpec, 'payload should contain chaincodeSpec');
      // console.log(payload.chaincodeSpec.ctorMsg.args);
      // assert.equal(payload.chaincodeSpec.ctorMsg.args, 'delete',
      // 'the function should be a delete');
    });
  });
  //test the decodeChaincodeID function
  describe('decodeChaincodeID', function() {
    it('should decode and return the chaincode ID', function() {
      var id = util.decodeChaincodeID(validBlock.transactions[0]);
      assert.isDefined(id);
      assert.property(id, 'name', 'should contain a name');
      assert.isString(id.name, 'the chaincodeID name should be a string');
      assert.isAtLeast(id.name.length, 1, 'the chaincodeID should have a name');
    });
  });
  describe('decodeType', function() {
    it('should return the transaction type', function() {
      var type = util.decodeType(validBlock.transactions[0]);
      assert.isDefined(type);
      assert.oneOf(type, ['CHAINCODE_DEPLOY', 'CHAINCODE_INVOKE', 'CHAINCODE_QUERY', 'CHAINCODE_TERMINATE']);
    });
  });
  describe('decodeBlock', function() {
    it('should decode the block transactions', function() {
      var newBlock = util.decodeBlock(validBlock);
      var id, type;
      assert.isDefined(newBlock);
      //console.log(newBlock);
      for (var i = 0; i < 2; i++) {
        assert.isObject(newBlock.transactions[i].payload,
          'decoded payload is an object');
        assert.isDefined(newBlock.transactions[i].payload.chaincodeSpec,
          'payload should contain chaincodeSpec');
        // assert.equal(newBlock.transactions[i].payload.chaincodeSpec.ctorMsg.function,
        //   'delete', 'the function should be a delete');
        id = newBlock.transactions[i].chaincodeID;
        assert.isDefined(id);
        assert.property(id, 'name', 'should contain a name');
        assert.isString(id.name, 'the chaincodeID name should be a string');
        assert.isAtLeast(id.name.length, 1, 'the chaincodeID should have a name');
        type = newBlock.transactions[i].type;
        assert.isDefined(type);
        assert.oneOf(type, ['CHAINCODE_DEPLOY', 'CHAINCODE_INVOKE', 'CHAINCODE_QUERY', 'CHAINCODE_TERMINATE']);
      }
    });
  });
});

var lastBlock = 4;

describe('Blockchain REST interface', function() {
  describe('bad endpoint', function() {
    it('should return a 404 error', function(done) {
      request
      .get(url + '/badEndPoint')
      .end(function(err, res) {
        assert.isNotNull(err);
        //console.log(err.response.error);
        assert.equal(err.status, 404, 'status should be 404');
        done();
      })
    });
  });
  describe('GET /chain', function() {
    it('should return valid data', function(done) {
      request
      .get(url + '/chain')
      .end(function(err, res) {
        assert.isNull(err);
        //console.log(res.body);
        assert.equal(res.status, 200, 'should recieve a 200 status');
        assert.isObject(res.body, 'should return chain stats');
        assert.property(res.body, 'height', 'chain stats should contain height');
        assert.isNumber(res.body.height, 'height should be a number');
        lastBlock = res.body.height - 1;
        assert.property(res.body, 'currentBlockHash',
                                'chain stats should contain currentBlockHash');
        assert.isString(res.body.currentBlockHash, 'hash should be a string');
        assert.property(res.body, 'previousBlockHash',
                                'chain stats should contain previousBlockHash');
        assert.isString(res.body.previousBlockHash, 'hash should be a string');
        done();
      });
    });
  });
  describe('GET lastest block', function() {
    it('should return valid block at the end of the chain', function(done) {
      request
      .get(url + '/chain/blocks/' + lastBlock)
      .end(function(err, res) {
        assert.isNull(err);
        //console.log(res.body.transactions[0].payload);
        assert.equal(res.status, 200, 'should recieve a 200 status');
        assert.isObject(res.body, 'should return a block');
        // can't assume a block will contain transactions
        // assert.property(res.body, 'transactions', 'the block should contain transactions');
        // assert.property(res.body.transactions[0], 'payload',
        //         'the transaction should have a payload');
        // assert.property(res.body.transactions[0].payload, 'chaincodeSpec',
        //         'the payload should have a chaincodeSpec');
        done();
      });
    });
  });
  describe('GET payload by block ID', function() {
    it('should return valid payload for the last block of the chain', function(done) {
      request
      .get(url + '/payload/' + lastBlock)
      .end(function(err, res) {
        assert.isNull(err);
        assert.equal(res.status, 200, 'should recieve a 200 status');
        assert.isObject(res.body, 'should return a payload');
        //console.log(res.body);
        assert.property(res.body, 'chaincodeSpec',
          'the payload should have a chaincodeSpec');
        done();
      });
    });
  });
  describe('GET a block list', function() {
    it('should return a list of 4 blocks from the end of the chain', function(done) {
      request
      .get(url + '/chain/blockList/' + 4)
      .end(function(err, res) {
        assert.isNull(err);
        assert.equal(res.status, 200, 'should recieve a 200 status');
        assert.isArray(res.body, 'should return list of blocks');
        assert.lengthOf(res.body, 4, 'there should be 4 blocks in the list');
        //console.log(res.body);
        assert.property(res.body[0], 'id', 'a memeber of the array should contain an id');
        assert.equal(res.body[0].id, lastBlock,
          'the id of the 1st member should be the last block');
        assert.property(res.body[0], 'block',
          'a memeber of the array should contain a block');
        assert.property(res.body[0].block, 'transactions',
          'a block should have transactions');
        done();
      });
    });
  });
  describe('GET a transaction list', function() {
    it('should return a list of 4 transaction', function(done) {
      request
      .get(url + '/chain/transactionList/' + 4)
      .end(function(err, res) {
        assert.isNull(err);
        assert.equal(res.status, 200, 'should recieve a 200 status');
        assert.isArray(res.body, 'should return list of transactions');
        //console.log(res.body);
        assert.lengthOf(res.body, 4, 'there should be 4 transactions in the list');
        assert.property(res.body[0], 'transaction',
          'a memeber of the array should contain a transaction');
        assert.property(res.body[0], 'result',
          'a memeber of the array should contain a result');
        assert.property(res.body[0].transaction, 'type',
          'a memeber of the array should contain a type');
        assert.property(res.body[0].transaction, 'payload',
          'a transaction should have a payload');
        done();
      });
    });
  });
});

//testing the REST interface that uses the node SDK
describe('Chaincode REST interface', function() {
//   before(function(done) {
//     request
//     .post(url + '/addUser')
//     .send({name: 'testUser3', amount: '100'})
//     .end(function(err, res) {});
//     request
//     .post(url + '/addUser')
//     .send({name: 'testUser4', amount: '200'})
//     .end(function(err, res) {});
//     setTimeout(function() {
//       done();
//     }, 2000);    // hack to give time for the transaction to complete
// });

  describe('/addUser', function() {
    it('should add a new user', function(done) {
      this.timeout(4000);
      request
      .post(url + '/addUser')
      .send({name: 'testUser1', amount: '100'})
      .end(function(err, res) {
      assert.isNull(err);
      //console.log(res.body);
      assert.property(res.body, 'uuid', 'reply should have uuid');
      done();
      });
    });
    it('should add a second user', function(done) {
      this.timeout(4000);
      request
      .post(url + '/addUser')
      .send({name: 'testUser2', amount: '200'})
      .end(function(err, res) {
      assert.isNull(err);
      //console.log(res.body);
      assert.property(res.body, 'uuid', 'reply should have uuid');
      setTimeout(function() {
        done();
      }, 2000);    // hack to give time for the transaction to complete
      });
    });
  });
  describe('/userList', function(){
    it('should return a list of users', function(done) {
      this.timeout(4000);
      request
      .get(url + '/userList')
      .accept('application/json')
      .end(function(err, res) {
        assert.isNull(err);
        //console.log(res.body);
        assert.property(res.body, 'testUser1', 'testUser1 should be in the list');
        assert.equal(res.body.testUser1, 100, 'testUser1 amount should be 100');
        assert.property(res.body, 'testUser2', 'testUser2 should be in the list');
        assert.equal(res.body.testUser2, 200, 'testUser2 amount should be 200');
        done();
      });
    });
  });
  describe('/transfer', function() {
    it('should transfer 10 from testUser1 to testUser2', function(done) {
      this.timeout(4000);
      request
      .post(url + '/transfer')
      .send({fromName: 'testUser1', toName: 'testUser2', amount: '10'})
      .end(function(err, res) {
        assert.isNull(err);
        //console.log(res.body);
        assert.property(res.body, 'uuid', 'reply should have uuid');
        setTimeout(function() {
          done();
        }, 2000);    // hack to give time for the transaction to complete
      });
    });
    it('should transfer correct amount', function(done) {
      this.timeout(4000);
      request
      .get(url + '/userList')
      .end(function(err, res) {
        assert.isNull(err);
        //console.log(res.body);
        assert.property(res.body, 'testUser1', 'testUser1 should be in the list');
        assert.equal(res.body.testUser1, 90, 'testUser1 amount should be 90');
        assert.property(res.body, 'testUser2', 'testUser2 should be in the list');
        assert.equal(res.body.testUser2, 210, 'testUser2 amount should be 210');
        done();
      });
    });
  });
  describe('/userHistory/testUser1', function() {
    it('should return a transaction list for the given user', function(done) {
      request
      .get(url + '/userHistory/' + 'testUser1')
      .end(function(err, res) {
        assert.isNull(err);
        assert.equal(res.status, 200, 'should recieve a 200 status');
        assert.isArray(res.body, 'should return list of transactions');
        assert.isAtLeast(res.body.length, 2,
          'there should be at least 2 transactions in the list');
        assert.property(res.body[0], 'transaction',
          'a memeber of the array should contain a transaction');
        assert.property(res.body[0], 'result',
          'a memeber of the array should contain a result');
        assert.property(res.body[0].transaction, 'type',
          'a memeber of the array should contain a type');
        assert.property(res.body[0].transaction, 'payload',
          'a transaction should have a payload');
        assert.include(res.body[0].transaction.payload.chaincodeSpec.ctorMsg.args, 'testUser1',
          'the function args should contain testUser1');
        done();
      });
    });
  });
  describe('/verifyBalance/', function() {
    it('should be able to verify the correct user balance', function(done) {
      this.timeout(4000);
      request
      .post(url + '/verifyBalance')
      .send({name: 'testUser1', balance: '90'})
      .end(function(err, res) {
        assert.isNull(err);
        assert.equal(res.status, 200, 'should recieve a 200 status');
        assert.property(res.body, 'errorCode', 'response should have an errorCode');
        assert.equal(res.body.errorCode, 0, 'should return a 0 for correctly verifing the balance');
        assert.property(res.body, 'error', 'response should have an error description');
        assert.equal(res.body.error, 'verified', 'should return verified');
        done();
      });
    });
    it('should report an error for an incorrect user balance', function(done) {
      this.timeout(4000);
      request
      .post(url + '/verifyBalance')
      .send({name: 'testUser1', balance: '1000'})
      .end(function(err, res) {
        assert.isNull(err);
        assert.equal(res.status, 200, 'should recieve a 200 status');
        assert.property(res.body, 'errorCode', 'response should have an errorCode');
        assert.equal(res.body.errorCode, 2, 'should return a 2 for incorrect balance');
        assert.property(res.body, 'error', 'response should have an error description');
        assert.equal(res.body.error, 'incorrect balance', 'should return incorrect balance');
        done();
      });
    });
    it('should report an error for an incorrect user name', function(done) {
      this.timeout(4000);
      request
      .post(url + '/verifyBalance')
      .send({name: 'testUser10', balance: '90'})
      .end(function(err, res) {
        assert.isNull(err);
        assert.equal(res.status, 200, 'should recieve a 200 status');
        assert.property(res.body, 'errorCode', 'response should have an errorCode');
        assert.equal(res.body.errorCode, 1, 'should return a 2 for incorrect balance');
        assert.property(res.body, 'error', 'response should have an error description');
        assert.equal(res.body.error, 'invalid name', 'should return incorrect balance');
        done();
      });
    });
  });
  describe('/delUser', function() {
    it('should delete a user', function(done) {
      this.timeout(4000);
      request
      .post(url + '/delUser')
      .send({name: 'testUser1'})
      .end(function(err, res) {
      assert.isNull(err);
      //console.log(res.body);
      assert.property(res.body, 'uuid', 'reply should have uuid');
      done();
      });
    });
    it('should delete second test user', function(done) {
      this.timeout(4000);
      request
      .post(url + '/delUser')
      .send({name: 'testUser2'})
      .end(function(err, res) {
      assert.isNull(err);
      //console.log(res.body);
      assert.property(res.body, 'uuid', 'reply should have uuid');
      setTimeout(function() {
        done();
      }, 2000);    // hack to give time for the transaction to complete
      });
    });
    it('both test users should be gone', function(done) {
      this.timeout(4000);
      request
      .get(url + '/userList')
      .end(function(err, res) {
        assert.isNull(err);
        //console.log(res.body);
        assert.notProperty(res.body, 'testUser1', 'testUser1 should not be in the list');
        assert.notProperty(res.body, 'testUser2', 'testUser2 should be not in the list');
        done();
      });
    });
  });
});

describe('Blockchain utilities', function() {
  describe('updateChain()', function() {
    it('updateChain should update the chain height', function(done) {
      this.timeout(30000);
      //var origHeight = util.updateChain();
      var origHeight = 0;
      util.updateChain(origHeight).then(function(height){
        //console.log('origHeight is ' + height);
        origHeight = height;
      }, function(response) {
        console.log(response);
        console.log('Error updating the chain height ' + response.error);
      });
      //console.log('origHeight is ' + origHeight);
      // issue a dummy transfer to create a new block
      request
      .post(url + '/transfer')
      .send({fromName: 'bogus1', toName: 'bogus2', amount: '10'})
      .end(function(err, res) {
        assert.isNull(err);
        setTimeout(function() {
          var newHeight = 0;
          util.updateChain(newHeight).then(function(height){
            //console.log('the newHeight is ' + height);
            newHeight = height;
            assert.equal(newHeight, origHeight + 1,
              'the blockchain height should increase by 1');
            done();
            }, function(response) {
              console.log(response);
              console.log('Error updating the chain height ' + response.error);
              assert.isNull(response);
              done();
            });
          }, 2000);    // hack to give time for the transaction to complete
        });
      });
    });
  });

describe('Block list utilities', function() {
  describe('initialBlockList', function() {
    it('should return 10 blocks if height is set to 11', function(done) {
      //testing...
      util.initialBlockList(11).then(function(list) {
        assert.isArray(list, 'should return list of blocks');
        assert.equal(list.length, 10, 'there should be 10 blocks');
        assert.property(list[9], 'id', 'should contain an id field');
        assert.equal(list[9].id, 10, 'the id of the last block should be 10');
        done();
      }, function(response) {
        assert.isNull(response, 'the initialBlockList should not fail');
        done();
      }).done();
    });
  });
});

describe('calcBalance function', function() {
  it('should return 100 from an init transaction', function() {
    var tx = transactions[0];
    var newBalance = util.calcBalance(tx.transaction, tx.result, 'a', 0);
    assert.equal(newBalance, 100, 'should be 100');
  });
  it('should leave the balance unchanged if there are errors ', function() {
    var tx = transactions[1];
    var newBalance = util.calcBalance(tx.transaction, tx.result, 'a', 100);
    assert.equal(newBalance, 100, 'should still be 100');
    var tx = transactions[0];
    var newBalance = util.calcBalance(tx.transaction, tx.result, 'bogus', 10);
    assert.equal(newBalance, 10,
      'should return the input balance if user not found');
  });
  it('TX transfer a,b,10 should reduce the balance by 10', function() {
    var tx = transactions[2];
    var newBalance = util.calcBalance(tx.transaction, tx.result, 'a', 100);
    assert.equal(newBalance, 90, 'after transfer a,b,10 balance should be 90');
  });
  it('TX transfer c,a,20 should increase the balance by 20', function() {
    var tx = transactions[3];
    var newBalance = util.calcBalance(tx.transaction, tx.result, 'a', 100);
    assert.equal(newBalance, 120, 'after transfer c,a,20 balance should be 120');
  });
  it('TX delete a should return a balance of 0', function() {
    var tx = transactions[4];
    var newBalance = util.calcBalance(tx.transaction, tx.result, 'a', 100);
    assert.equal(newBalance, 0, 'after delete balance should be 0');
  });
  it('TX new a,300 should return a balance of 300', function() {
    var tx = transactions[5];
    var newBalance = util.calcBalance(tx.transaction, tx.result, 'a', 100);
    assert.equal(newBalance, 300, 'balance should be 300');
  });
});
