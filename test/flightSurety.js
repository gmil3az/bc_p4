
var Test = require('../config/testConfig.js');
var BigNumber = require('bignumber.js');
var util = require('util');

contract('Flight Surety Tests', async (accounts) => {

  var config;
  before('setup contract', async () => {
    config = await Test.Config(accounts);
    await config.flightSuretyData.authorizeContract(config.flightSuretyApp.address);
  });

  /****************************************************************************************/
  /* Operations and Settings                                                              */
  /****************************************************************************************/

  it(`(multiparty) has correct initial isOperational() value`, async function () {

    // Get operating status
    let status = await config.flightSuretyData.isOperational.call();
    assert.equal(status, true, "Incorrect initial operating status value");

  });

  it(`(multiparty) can block access to setOperatingStatus() for non-Contract Owner account`, async function () {

      // Ensure that access is denied for non-Contract Owner account
      let accessDenied = false;
      try 
      {
          await config.flightSuretyData.setOperatingStatus(false, { from: config.testAddresses[2] });
      }
      catch(e) {
          accessDenied = true;
      }
      assert.equal(accessDenied, true, "Access not restricted to Contract Owner");
            
  });

  it(`(multiparty) can allow access to setOperatingStatus() for Contract Owner account`, async function () {

      // Ensure that access is allowed for Contract Owner account
      let accessDenied = false;
      try 
      {
          await config.flightSuretyData.setOperatingStatus(false);
      }
      catch(e) {
          accessDenied = true;
      }
      assert.equal(accessDenied, false, "Access not restricted to Contract Owner");
      
  });

  it(`(multiparty) can block access to functions using requireIsOperational when operating status is false`, async function () {

      await config.flightSuretyData.setOperatingStatus(false);

      let reverted = false;
      try 
      {
          await config.flightSuretyApp.registerAirline(config.testAddresses[2]);
      }
      catch(e) {
          reverted = true;
      }
      assert.equal(reverted, true, "Access not blocked for requireIsOperational");      

      // Set it back for other tests to work
      await config.flightSuretyData.setOperatingStatus(true);

  });

    it('(airline) cannot register an Airline using registerAirline() if it is not funded'
       + '[Airline can be registered, but does not participate in contract until it submits funding of 10 ether]', async () => {
    
    // ARRANGE
      let notFundedAirline = accounts[1];
      let newAirline = accounts[2];

    // ACT
      try {
	  await config.flightSuretyApp.registerAirline(notFundedAirline, {from: config.owner});
          await config.flightSuretyApp.registerAirline(newAirline, {from: notFundedAirline});
    }
    catch(e) {
    }
      let result = await config.flightSuretyData.fetchAirline.call(newAirline, {from: config.flightSuretyApp.address});
    // ASSERT
      assert.equal(result.statusCode.toNumber(), 0, "Airline should not be able to register another airline if it hasn't provided funding");

  });

    it('(airline) Only existing airline may register a new airline until there are at least four airlines registered', async () => {
	
	// ARRANGE
	let secondAirline = accounts[1]; // notFundedAirline
	let registrationFee = web3.utils.toWei('10','ether');
	await web3.eth.sendTransaction({from:secondAirline, to:config.flightSuretyData.address, value: registrationFee});
	
	let thirdAirline = accounts[2];
	let fourthAirline = accounts[3];
	// ACT
	await config.flightSuretyApp.registerAirline(thirdAirline, {from: secondAirline});
	await config.flightSuretyApp.registerAirline(fourthAirline, {from: secondAirline});

	// Pre funding
	await checkAirlineStatus(thirdAirline, 2, "Third airline should be registered successfully");
	await checkAirlineStatus(fourthAirline, 2, "Fourth airline should be registered successfully");
	
	await web3.eth.sendTransaction({from:thirdAirline, to:config.flightSuretyData.address, value: registrationFee});
	await web3.eth.sendTransaction({from:fourthAirline, to:config.flightSuretyData.address, value: registrationFee});

	// Post funding
	await checkAirlineStatus(thirdAirline, 3, "Third airline should be funded successfully");
	await checkAirlineStatus(fourthAirline, 3, "Fourth airline should be funded successfully");
    });

    it('(airline) Registration of fifth and subsequent airlines requires multi-party consensus of 50% of registered airlines', async () => {

	let registrationFee = web3.utils.toWei('10','ether');
	// ARRANGE
	let firstAirline = accounts[0];
	let secondAirline = accounts[1];	
	let thirdAirline = accounts[2];
	let fourthAirline = accounts[3];
	await checkAirlineStatus(firstAirline, 3, "First airline should be funded successfully");
	await checkAirlineStatus(secondAirline, 3, "Second airline should be funded successfully");
	await checkAirlineStatus(thirdAirline, 3, "Third airline should be funded successfully");
	await checkAirlineStatus(fourthAirline, 3, "Fourth airline should be funded successfully");

	checkNumberOfRegisteredAirlines(4);

	let fifthAirline = accounts[4];
	// ACT
	await config.flightSuretyApp.registerAirline(fifthAirline, {from: firstAirline});
	await checkAirlineStatus(fifthAirline, 1, "New airline should be in pending status [1 vote]");
	try{
	    await config.flightSuretyApp.registerAirline(fifthAirline, {from: firstAirline});
	}catch(e){
	    //The sender has already voted for this airline
	}
	await checkAirlineStatus(fifthAirline, 1, "Fifth airline should be in pending status [1 votes]");
	await config.flightSuretyApp.registerAirline(fifthAirline, {from: secondAirline});
	await checkAirlineStatus(fifthAirline, 2, "Fifth airline should be in registered status [2 votes]");

	await web3.eth.sendTransaction({from:fifthAirline, to:config.flightSuretyData.address, value: registrationFee});
	await checkAirlineStatus(fifthAirline, 3, "Fifth airline should be in funded status");
	checkNumberOfRegisteredAirlines(5);

	let sixthAirline = accounts[5];
	await config.flightSuretyApp.registerAirline(sixthAirline, {from: firstAirline});
	await checkAirlineStatus(sixthAirline, 1, "Sixth airline should be in pending status [1 vote]");
	await config.flightSuretyApp.registerAirline(sixthAirline, {from: secondAirline});
	await checkAirlineStatus(sixthAirline, 2, "Sixth airline should be in pending status [2 vote]");

	await web3.eth.sendTransaction({from:sixthAirline, to:config.flightSuretyData.address, value: registrationFee});
	await checkAirlineStatus(sixthAirline, 3, "Sixth airline should be in funded status");
	checkNumberOfRegisteredAirlines(6);

	let seventhAirline = accounts[6];
	await config.flightSuretyApp.registerAirline(seventhAirline, {from: firstAirline});
	await checkAirlineStatus(seventhAirline, 1, "Seventh airline should be in pending status [1 vote]");
	await config.flightSuretyApp.registerAirline(seventhAirline, {from: secondAirline});
	await checkAirlineStatus(seventhAirline, 1, "Seventh airline should be in pending status [2 vote]");
	await config.flightSuretyApp.registerAirline(seventhAirline, {from: thirdAirline});
	await checkAirlineStatus(seventhAirline, 2, "Seventh airline should be in registered status [3 vote]");

    });

    it('(flight) register new flight successfully', async () => {
	let flight = 'ND1309'; // Course number
	let timestamp = Math.floor(Date.now() / 1000);
	let secondAirline = accounts[1];	
	await config.flightSuretyApp.registerFlight(flight, timestamp, {from: secondAirline});
    });

    it(`(flight) register new flight fail due to airline not funded`, async function () {
	let flight = 'ND1310'; // Course number
	let timestamp = Math.floor(Date.now() / 1000);
	let seventhAirline = accounts[6];
	
	let airlineNotFunded = false;
	try 
	{
	    await config.flightSuretyApp.registerFlight(flight, timestamp, {from: seventhAirline});
	}
	catch(e) {
            airlineNotFunded = true;
	}
	assert.equal(airlineNotFunded, true, "Airline registered but not funded should not be able to register a flight");
        
    });

    it('(scenario) user buy insurance, then the flight delayed, and then he claims it', async () => {
	// make sure the flight has been registered
	let flight = 'ND1311'; 
	let timestamp = Math.floor(Date.now() / 1000);
	let airline = accounts[1];
	let user = accounts[8];
	await config.flightSuretyApp.registerFlight(flight, timestamp, {from: airline});
	// register oracles
	await registerOracles();
	// buy insurance for the flight
	let amount = web3.utils.toWei('1','ether');
	await config.flightSuretyApp.buyFromApp(airline, flight, timestamp, {from: user, value: amount});
	// update flight status manually
	await updateFlightStatus(airline, flight, timestamp, STATUS_CODE_LATE_AIRLINE);

	let balanceBeforeClaimingInsurance = await web3.eth.getBalance(user);
	
	// claim insurance
	await config.flightSuretyApp.withdraw(airline, flight, timestamp, {from: user});
	
	let balanceAfterClaimingInsurance = await web3.eth.getBalance(user);

	let difference = web3.utils.toWei('1.5','ether');
	let differenceThreshold = web3.utils.toWei('10000000000000000', 'wei');
	let delta = Number(balanceBeforeClaimingInsurance) + Number(difference) - Number(balanceAfterClaimingInsurance);
	console.log(`Delta amount = ${delta}`);
	assert.equal(delta <= differenceThreshold, true, "Delta balance should be within the expected threshold");

	// claim insurance again --> fail
	var claimAgainFail = false;
	try{
	    await config.flightSuretyApp.withdraw(airline, flight, timestamp, {from: user});
	}catch(e){
	    claimAgainFail = true;
	}
	assert.equal(claimAgainFail, true, "The amount has already been claimed");
    });

    it('(scenario) user buy insurance, then the flight on time, and then he claims it', async () => {
	// make sure the flight has been registered
	let flight = 'ND1311'; 
	let timestamp = Math.floor(Date.now() / 1000);
	let airline = accounts[1];
	let user = accounts[8];
	await config.flightSuretyApp.registerFlight(flight, timestamp, {from: airline});
	// register oracles
	await registerOracles();
	// buy insurance for the flight
	let amount = web3.utils.toWei('1','ether');
	await config.flightSuretyApp.buyFromApp(airline, flight, timestamp, {from: user, value: amount});
	// update flight status manually
	await updateFlightStatus(airline, flight, timestamp, STATUS_CODE_ON_TIME);

	let balanceBeforeClaimingInsurance = await web3.eth.getBalance(user);
	
	// claim insurance
	var claimFail = false;
	try{
	    await config.flightSuretyApp.withdraw(airline, flight, timestamp, {from: user});
	}catch(e){
	    claimFail = true;
	}
	assert.equal(claimFail, true, "The claim should result in failure");
        
	let balanceAfterClaimingInsurance = await web3.eth.getBalance(user);
	
	let differenceThreshold = web3.utils.toWei('10000000000000000', 'wei');
	let delta = Number(balanceBeforeClaimingInsurance) - Number(balanceAfterClaimingInsurance);
	console.log(`Delta amount = ${delta}`);
	assert.equal(delta <= differenceThreshold, true, "Delta balance should be within the expected threshold");
    });

    async function checkAirlineStatus(airline, expectedStatusCode, msg){
	let response = await config.flightSuretyData.fetchAirline.call(airline, {from: config.flightSuretyApp.address});
	assert.equal(response.statusCode.toNumber(), expectedStatusCode, msg);
    }

    async function checkNumberOfRegisteredAirlines(expectedNumber){
	let numberOfRegisteredAirlines = await config.flightSuretyData.numberOfRegisteredAirlines.call();
	assert.equal(numberOfRegisteredAirlines.toNumber(), expectedNumber, `Number of registered airlines must equal to ${expectedNumber}`);
    }

    const TEST_ORACLES_COUNT = 20;
    
    const STATUS_CODE_UNKNOWN = 0;
    const STATUS_CODE_ON_TIME = 10;
    const STATUS_CODE_LATE_AIRLINE = 20;
    const STATUS_CODE_LATE_WEATHER = 30;
    const STATUS_CODE_LATE_TECHNICAL = 40;
    const STATUS_CODE_LATE_OTHER = 50;

    async function registerOracles(){
	let fee = await config.flightSuretyApp.REGISTRATION_FEE.call();
	for(let a=10; a<TEST_ORACLES_COUNT; a++) {      
	    await config.flightSuretyApp.registerOracle({ from: accounts[a], value: fee });
	    let result = await config.flightSuretyApp.getMyIndexes.call({from: accounts[a]});
	    console.log(`Oracle Registered: ${result[0]}, ${result[1]}, ${result[2]}`);
	}
    }

    async function updateFlightStatus(airline, flight, timestamp, expectedStatusCode){
	await config.flightSuretyApp.fetchFlightStatus(airline, flight, timestamp);

	for(let a=10; a<TEST_ORACLES_COUNT; a++) {

	    // Get oracle information
	    let oracleIndexes = await config.flightSuretyApp.getMyIndexes.call({ from: accounts[a]});
	    for(let idx=0;idx<3;idx++) {

		try {
		    // Submit a response...it will only be accepted if there is an Index match
		    await config.flightSuretyApp.submitOracleResponse(oracleIndexes[idx], airline, flight, timestamp, expectedStatusCode, { from: accounts[a] });

		}
		catch(e) {
		    // Enable this when debugging
		    console.log('\nError', idx, oracleIndexes[idx].toNumber(), flight, timestamp, expectedStatusCode);
		}

	    }
	}
    }

});
