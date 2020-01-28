import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import Config from './config.json';
import OraclesConfig from './oracles.json';
import Web3 from 'web3';
import express from 'express';
import "@babel/polyfill";
import util from 'util';


let config = Config['localhost'];
let oracleAddresses = OraclesConfig['oracles'];
let oracles = [];
let web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws')));
web3.eth.defaultAccount = web3.eth.accounts[0];
let flightSuretyApp = new web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);

const oracleRegistrationFee = web3.utils.toWei('1', 'ether');
console.log(`oracleAddresses: ${oracleAddresses}`);

web3.eth.getBlock("latest").then((latestBlock, err) => console.log(`latestBlock: ${util.inspect(latestBlock)}`));

oracleAddresses.forEach(async (oracleAddress) => {
    let balance = await web3.eth.getBalance(oracleAddress);
    console.log(`oracleAddress: ${oracleAddress}, balance: ${balance}`);
    let response = await flightSuretyApp.methods.registerOracle().send({from: oracleAddress, value: oracleRegistrationFee, gas:1000000});
    // console.log(`registerOracle response: ${util.inspect(response)}`);
    let indexes = await flightSuretyApp.methods.getMyIndexes().call({from: oracleAddress});
    console.log(`oracleAddress: ${oracleAddress}, indexes: ${util.inspect(indexes)}`);
    oracles.push({oracleAddress: oracleAddress, indexes: indexes});
});

const flightStatuses = [0, 10, 20 ,30 ,40 ,50];

flightSuretyApp.events.OracleRequest({
    fromBlock: 0
  }, function (error, event) {
      if (error) console.log(error);
      console.log(event);
      oracleRequest = event.returnValues;
      let targetOracles = oracles.filter(oracle => oracle.indexes.includes(oracleRequest.index));
      console.log(`targetOracles: ${targetOracles}`);
      targetOracles.forEach( async oracle => {
	  let flightStatusCode = flightStatuses[Math.floor(Math.random()*items.length)];
	  await flightSuretyApp.methods.submitOracleResponse(oracleRequest.index, oracleRequest.airline, oracleRequest.flight, oracleRequest.timestamp, flightStatusCode).send({from: oracle.oracleAddress });
      });
  });

flightSuretyApp.events.OracleReport({
    fromBlock: 0
}, function (error, event) {
    if (error) console.log(error);
    console.log(event.returnValues);
});

flightSuretyApp.events.FlightStatusInfo({
    fromBlock: 0
}, function (error, event) {
    if (error) console.log(error);
    console.log(event.returnValues);
});

const app = express();
app.get('/api', (req, res) => {
    res.send({
      message: 'An API for use with your Dapp!'
    })
})

export default app;


