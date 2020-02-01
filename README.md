# My FlightSurety

## My versions

* Truffle v5.1.10
* Node v10.18.0
* Ganache CLI v6.8.1 (ganache-core: 2.9.1)
* Web3 v1.2.4

## How to test the project from the frontend?

Run `npm install`

Run ganache cli with 30 accounts created:

`ganache-cli -a 30 -l 8000000`

Compile and deploy contracts on the local environment:

`truffle compile && truffle migrate --reset`

Copy the public keys of those 30 accounts and save them into ./src/server/oracles.json file. This step is required because those oracles need some money to register itself with the contract (10 ether registration fee).

Start server to simulate oracles:

`npm run server`

Start dapp:

`npm run dapp`

Go to localhost:8000 to see the dapp. To simply test the dapp, you can do the following:
1. Select the flight that you want for all three drop down boxes (the same flight)
2. Click on Buy button to buy the insurance of the selected flight
3. Click on Submit-to-Oracles button to initiate the flight status update
4. Go to the console of `npm run server`, you will see like the following:

`Flight [TG1001] status has been updated to [20]`

You might want to do step number 3 until you see such message with the status code not equal 0 or 10.

5. Click on Claim button to get the amount back. You can also see the current balance will be increase ~1.5 ether.

## How to run tests?

In order to run tests you can simply run the following commands:

`truffle compile && truffle test`

I've include the tests for airline consensus, oracles registration as well as the complete scenario tests. Please see the test files.

# FlightSurety

FlightSurety is a sample application project for Udacity's Blockchain course.

## Install

This repository contains Smart Contract code in Solidity (using Truffle), tests (also using Truffle), dApp scaffolding (using HTML, CSS and JS) and server app scaffolding.

To install, download or clone the repo, then:

`npm install`
`truffle compile`

## Develop Client

To run truffle tests:

`truffle test ./test/flightSurety.js`
`truffle test ./test/oracles.js`

To use the dapp:

`truffle migrate`
`npm run dapp`

To view dapp:

`http://localhost:8000`

## Develop Server

`npm run server`
`truffle test ./test/oracles.js`

## Deploy

To build dapp for prod:
`npm run dapp:prod`

Deploy the contents of the ./dapp folder


## Resources

* [How does Ethereum work anyway?](https://medium.com/@preethikasireddy/how-does-ethereum-work-anyway-22d1df506369)
* [BIP39 Mnemonic Generator](https://iancoleman.io/bip39/)
* [Truffle Framework](http://truffleframework.com/)
* [Ganache Local Blockchain](http://truffleframework.com/ganache/)
* [Remix Solidity IDE](https://remix.ethereum.org/)
* [Solidity Language Reference](http://solidity.readthedocs.io/en/v0.4.24/)
* [Ethereum Blockchain Explorer](https://etherscan.io/)
* [Web3Js Reference](https://github.com/ethereum/wiki/wiki/JavaScript-API)
