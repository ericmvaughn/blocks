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
`vagrant ssh`
If fabric hasn't be built yet then do the following.
```
cd /hyperledger/
go build
```
Next start the member services.
```
cd /hyperledger/
export MEMBERSRVC_CA_ACA_ENABLED=true
 ./build/bin/membersrvc
```
In the second window start a validating peer.
```
cd $GOPATH/src/github.com/hyperledger/fabric/devenv/
vagrant ss
cd /hyperledger/
export CORE_SECURITY_ENABLED=true
export CORE_SECURITY_PRIVACY=true
./build/bin/peer node start
```

In the third console start the node server in the directory the app was installed
in.

`node api.js`

At this point you can connect from a browser using `http://localhost:3000`

## Testing
To run both the linter and code style checker run `gulp` with no parameters.

To run testing that will generate transactions and exercise all of the server
capabilities run `gulp test`.

## Acknowledgement
This project was based heavily on the IBM Marbles example and the Hyperledger
 [fabric](https://github.com/hyperledger/fabric) project.

 ###### Markdown formatting examples
 1.  You can put stars on both ends of a word to make it *italics* or
 2.  Two stars to make it **bold**
 3.  Create links to headers with the document like [this](#Setting-up-testing-blockchain)
 4.  Do bullets by putting a star in front of the sentence
*  bullet 1
*  bullet 2


*  bullets outside of the numbered list
*  second bullet
  * tabbed bullet
