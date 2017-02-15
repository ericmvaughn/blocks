# Example App for Hyperledger version 0.5

## Note: This branch is compatable with the 0.5 version of fabric.

This project is an example app demonstrating some of the Hyperledger/fabric
capabilities.  This app uses both the Node.js SDK and the REST interface.  The
features that display information about the blockchain and its transactions
primarily use the REST interface while the features that execute chaincode
transactions use the SDK.

## Installation

`git clone https://github.com/ericmvaughn/blocks.git`

```
npm install -g gulp
npm install -g mocha
```


## Setting up a test blockchain

### Bluemix blockchain
To get started you will need an account on Bluemix.

Provision the blockchain service from the list of Application services.

Open up the management panel for the blockchain service and select the "Service
Credentials" tab and then select "View Credentials".  Copy and paste the
credentials into a file named something similar to `cred-blockchain-ma.json`.

Modify the api_url lines from `http` to `https`.

Edit the following line in both api.js and util.js to match your credentials
filename.
```
var cred = require('./cred-blockchain-ma.json');
```
Start the node server in the directory the app was installed
in.

`node api.js`

Connect to the node server from a browser using `http://localhost:3000`

### Vagrant local blockchain
Follow the instructions from the Hyperledger Fabric project to install Vagrant
and the fabric source.  Using windows start 3 git-bash consoles in administrator
mode.  

In the first console build the vagrant environment which can take some time.
```
cd $GOPATH/src/github.com/hyperledger/fabric/devenv/
vagrant up
```
Once this completes login to the vagrant image.
```
vagrant ssh
```
#### Initial Installation
>  If fabric hasn't be built yet then do the following.
  ```
  cd /hyperledger
  make all
  ```
  Delete the block chain created during the build process
  ```
  rm -r /var/hyperledger/production/
  ```
  Also delete the files under `tmp/keyValStore` in the blocks source directory.
  Note: Only delete these files the first time you run or anytime you delete the
  `/var/hyperledger/production` directory in vagrant.

Next start the member services.
```
cd /hyperledger/
export MEMBERSRVC_CA_ACA_ENABLED=true
 ./build/bin/membersrvc
```
In the second window start a validating peer.
```
cd $GOPATH/src/github.com/hyperledger/fabric/devenv/
vagrant ssh
cd /hyperledger/
export CORE_SECURITY_ENABLED=true
export CORE_SECURITY_PRIVACY=true
./build/bin/peer node start
```

In the third console start the node server in the directory the app was installed
in.

`node api.js`

At this point you can connect from a browser using `http://localhost:3000`

## Manually deploy the chaincode
Until the SDK deploy function is working use the REST interface to deploy
the chaincode from the Github repository.  The postman app works well for this.

First step is to register one of the users defined in the membersrvc.yaml file.
```
POST http://localhost:7050/registrar

BODY
{
      "enrollId": "jim",
      "enrollSecret": "6avZQLwcUe9b"
}


POST  http://localhost:7050/chaincode

body
{
  "jsonrpc": "2.0",
  "method": "deploy",
  "params": {
    "type": 1,
    "chaincodeID":{
        "path":"https://github.com/ericmvaughn/blocks_chaincode"
    },
    "ctorMsg": {
        "function":"init",
        "args":["a", "1000", "b", "2000"]
    },
    "secureContext": "jim"
  },
  "id": "1"  
}

results
{
  "jsonrpc": "2.0",
  "result": {
    "status": "OK",
    "message": "77dcb5e38265da1ef3f51edee25b3612085bcbd26262da4236da5ceb4387a655a3c60476c4aed35e1ca78dcdb6417a7e4c88965aa88ffa39878c7c8bde2a0772"
  },
  "id": "1"
}

```

The message value in the results contains the chaincode ID that needs to be saved
in the `tmp/keyValStore/chaincodeID` file.

**NOTE:** A restart of node may be required at this point.

## Testing
To run both the linter and code style checker run `gulp` with no parameters.

To run testing that will generate transactions and exercise all of the server
capabilities run `gulp test`.

## Acknowledgement
This project was based heavily on the IBM Marbles example and the Hyperledger
 [fabric](https://github.com/hyperledger/fabric) project.


##### Markdown formatting examples
 1.  You can put stars on both ends of a word to make it *italics* or
 2.  Two stars to make it **bold**
 3.  Create links to headers with the document like [this](#Setting-up-testing-blockchain)
 4.  Do bullets by putting a star in front of the sentence
*  bullet 1
*  bullet 2


*  bullets outside of the numbered list
*  second bullet
  * tabbed bullet
