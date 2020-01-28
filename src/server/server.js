import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import Config from './config.json';
import OraclesConfig from './oracles.json';
import Web3 from 'web3';
import express from 'express';


let config = Config['localhost'];
let oracleAddresses = OraclesConfig['oracles'];
let oracles = [];
let web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws')));
web3.eth.defaultAccount = web3.eth.accounts[0];
let flightSuretyApp = new web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);

const oracleRegistrationFee = web3.toWei(1, "ether");

oracleAddresses.foreach(async (oracleAddress) => {
    await flightSuretyApp.methods.registerOracle().send({from: oracleAddress, value: oracleRegistrationFee});
    let indexes = await FlightSuretyApp.methods.getMyIndexes().call({from: oracleAddress});
    console.log(`oracleAddress: ${oracleAddress}, indexes: ${indexes}`);
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
      targetOracles.foreach( async oracle => {
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


