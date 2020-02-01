import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import FlightSuretyData from '../../build/contracts/FlightSuretyData.json';
import Config from './config.json';
import Web3 from 'web3';

export default class Contract {
    constructor(network, callback) {

        this.config = Config[network];
        this.web3 = new Web3(new Web3.providers.HttpProvider(this.config.url));
        this.flightSuretyApp = new this.web3.eth.Contract(FlightSuretyApp.abi, this.config.appAddress);
	this.flightSuretyData = new this.web3.eth.Contract(FlightSuretyData.abi, this.config.dataAddress);
        this.initialize(callback);
        this.owner = null;
        this.airlines = [];
        this.passengers = [];
    }

    initialize(callback) {
        this.web3.eth.getAccounts((error, accts) => {
            
            this.owner = accts[0];

            let counter = 1;
            
            while(this.airlines.length < 5) {
                this.airlines.push(accts[counter++]);
            }

            while(this.passengers.length < 5) {
                this.passengers.push(accts[counter++]);
            }

	    this.flightSuretyData.methods
		.authorizeContract(this.config.appAddress).send({from: this.owner}).then(() => {
		    console.log('App contract has been authorized to access data contract')
		    callback();
		}, reason => console.log(`Failed to authorize App contract to access Data contract`));
            
        });
    }

    isOperational(callback) {
	let self = this;
	self.flightSuretyApp.methods
            .isOperational()
            .call({ from: self.owner}, callback);
    }

    fetchFlightStatus(airline, flight, timestamp, callback) {
        let self = this;
        let payload = {
            airline: airline,
            flight: flight,
            timestamp: timestamp
        }; 
        self.flightSuretyApp.methods
            .fetchFlightStatus(payload.airline, payload.flight, payload.timestamp)
            .send({ from: self.passengers[0]}, (error, result) => {
                callback(error, payload);
            });
    }

    buyFromApp(airline, flight, timestamp, callback) {
        let self = this;
        let payload = {
            airline: airline,
            flight: flight,
            timestamp: timestamp
        };
	let amount = this.web3.utils.toWei('1', 'ether');
        self.flightSuretyApp.methods
            .buyFromApp(payload.airline, payload.flight, payload.timestamp)
            .send({ from: self.passengers[0], value: amount}, (error, result) => {
                callback(error, payload);
            });
    }

    withdraw(airline, flight, timestamp, callback) {
        let self = this;
        let payload = {
            airline: airline,
            flight: flight,
            timestamp: timestamp
        }; 
        self.flightSuretyApp.methods
            .withdraw(payload.airline, payload.flight, payload.timestamp)
            .send({ from: self.passengers[0]}, (error, result) => {
                callback(error, payload);
            });
    }

    registerAirlines(callback){
	let self = this;
	this.airlines.forEach((airline)=>{
	    self.flightSuretyApp.methods
		.registerAirline(airline)
		.send({ from: self.owner})
		.then(
		    ()=>callback(null, airline),
		    (reason)=>callback(reason, airline)
		);
	});
    }

    airlineFunding(airline, callback){
	this.web3.eth.sendTransaction({
	    from: airline,
	    to: this.config.dataAddress,
	    value: this.web3.utils.toWei('10', 'ether')
	}).then(
	    ()=>callback(null, airline),
	    (reason)=>callback(reason, airline)
	);
    }

    currentBalance(callback){
	let address = this.passengers[0];
	console.log(`address = ${address}`);
	this.web3.eth.getBalance(address).then(
	    (balance)=>{
		console.log(`Current balance of passenger[0] ${address} is ${balance}`);
		callback(null, web3.toDecimal(balance));
	    },(reason)=>callback(reason)
	);
    }

    async registerFlight(airline, flight, timestamp, callback){
	let self = this;
	let payload = {
            airline: airline,
            flight: flight,
            timestamp: timestamp
        };
	try{
	    await self.flightSuretyApp.methods
		.registerFlight(payload.flight, payload.timestamp).send({from: airline, gasPrice: '1', gas: '1000000'});
	    callback(null, payload);
	}catch(err){
	    callback(err);
	}
    }
}
