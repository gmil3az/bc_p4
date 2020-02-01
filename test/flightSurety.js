
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

    async function checkAirlineStatus(airline, expectedStatusCode, msg){
	let response = await config.flightSuretyData.fetchAirline.call(airline, {from: config.flightSuretyApp.address});
	assert.equal(response.statusCode.toNumber(), expectedStatusCode, msg);
    }

    async function checkNumberOfRegisteredAirlines(expectedNumber){
	let numberOfRegisteredAirlines = await config.flightSuretyData.numberOfRegisteredAirlines.call();
	assert.equal(numberOfRegisteredAirlines.toNumber(), expectedNumber, `Number of registered airlines must equal to ${expectedNumber}`);
    }
 

});
