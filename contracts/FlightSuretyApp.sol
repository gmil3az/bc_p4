pragma solidity ^0.4.25;

// It's important to avoid vulnerabilities due to numeric overflow bugs
// OpenZeppelin's SafeMath library, when used correctly, protects agains such bugs
// More info: https://www.nccgroup.trust/us/about-us/newsroom-and-events/blog/2018/november/smart-contract-insecurity-bad-arithmetic/

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

/************************************************** */
/* FlightSurety Smart Contract                      */
/************************************************** */
contract FlightSuretyApp {
    using SafeMath for uint256; // Allow SafeMath functions to be called for all uint256 types (similar to "prototype" in Javascript)

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    // Flight status codes
    uint8 private constant STATUS_CODE_UNKNOWN = 0;
    uint8 private constant STATUS_CODE_ON_TIME = 10;
    uint8 private constant STATUS_CODE_LATE_AIRLINE = 20;
    uint8 private constant STATUS_CODE_LATE_WEATHER = 30;
    uint8 private constant STATUS_CODE_LATE_TECHNICAL = 40;
    uint8 private constant STATUS_CODE_LATE_OTHER = 50;

    address private contractOwner;          // Account used to deploy contract
    FlightSuretyData private dataContract; // reference to the associated data contract

    // Airline status codes
    uint8 private constant AIRLINE_UNKNOWN = 0;
    uint8 private constant AIRLINE_PENDING = 1;
    uint8 private constant AIRLINE_REGISTERED = 2;
    uint8 private constant AIRLINE_FUNDED = 3;
 
    /********************************************************************************************/
    /*                                       FUNCTION MODIFIERS                                 */
    /********************************************************************************************/

    // Modifiers help avoid duplication of code. They are typically used to validate something
    // before a function is allowed to be executed.

    /**
    * @dev Modifier that requires the "operational" boolean variable to be "true"
    *      This is used on all state changing functions to pause the contract in 
    *      the event there is an issue that needs to be fixed
    */
    modifier requireIsOperational() 
    {
         // Modify to call data contract's status
        require(true, "Contract is currently not operational");  
        _;  // All modifiers require an "_" which indicates where the function body will be added
    }

    /**
    * @dev Modifier that requires the "ContractOwner" account to be the function caller
    */
    modifier requireContractOwner()
    {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }

    modifier requireRegisteredAirline()
    {
      bool isRegistered;
      uint8 statusCode;
      address[] memory votes;
      (statusCode, votes, isRegistered) = dataContract.fetchAirline(msg.sender);
      require(statusCode == AIRLINE_REGISTERED ||
	      statusCode == AIRLINE_FUNDED, "Airline must be registered");
      _;
    }

    modifier requireAirlineFunded(address _address){
      var (,statusCode,,) = dataContract.getAirline(_address);
      require(statusCode == AIRLINE_FUNDED, "Airline must be funded");
      _;
    }

    /********************************************************************************************/
    /*                                       CONSTRUCTOR                                        */
    /********************************************************************************************/

    /**
    * @dev Contract constructor
    *
    */
    constructor
                                (
				 address _dataContract
                                ) 
                                public 
    {
        contractOwner = msg.sender;
	dataContract = FlightSuretyData(_dataContract);
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    function isOperational() 
                            public 
                            pure 
                            returns(bool) 
    {
        return true;  // Modify to call data contract's status
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

  
   /**
    * @dev Add an airline to the registration queue
    *
    */   
    function registerAirline
      (
       address _airline
       )
      external
      requireAirlineFunded(msg.sender)
      returns(bool, uint256)
    {
      bool isRegistered;
      uint256 statusCode;
      address[] memory votes;
      (statusCode, votes, isRegistered) = dataContract.fetchAirline(_airline);
      uint256 numberOfRegisteredAirlines = dataContract.numberOfRegisteredAirlines();
      require(statusCode == AIRLINE_UNKNOWN ||
	      statusCode == AIRLINE_PENDING, "Airline must be in status of UNKNOWN or PENDING");
      if(numberOfRegisteredAirlines >= 4){
	address[] memory newVotes = new address[](votes.length + 1);
	for (uint i = 0; i < votes.length; i++){
	  newVotes[i] = votes[i];
	  require(msg.sender != votes[i], 'The sender has already voted for the airline');
	}
	newVotes[votes.length] = msg.sender;
	uint256 numberOfVotes = newVotes.length;
	if(numberOfVotes >= numberOfRegisteredAirlines.div(2)){
	  dataContract.registerAirline(_airline, AIRLINE_REGISTERED, newVotes);
	}else{
	  dataContract.registerAirline(_airline, AIRLINE_PENDING, newVotes);
	}
      }else{
        dataContract.registerAirline(_airline, AIRLINE_REGISTERED, votes);
      }
      return (true, numberOfVotes);
    }

   /**
    * @dev Register a future flight for insuring.
    *
    */
    function registerFlight
      (
       string flight,
       uint256 timestamp
       )
      external
      requireIsOperational
      requireAirlineFunded(msg.sender)
    {
      bytes32 key = getFlightKey(msg.sender, flight, timestamp);
      var (,isRegistered,,,) = dataContract.getFlight(key);
      require(!isRegistered, "The flight has been registered already");
      dataContract.registerFlight(flight, true, 0, timestamp, msg.sender);
    }

    function buyFromApp
      (
       address _airline,
       string _flight,
       uint256 _timestamp
       ) public payable requireIsOperational {
      require((msg.value <= 1 ether && msg.value > 0) ,"The insurance amount must be less than or equal to 1 ether, but greater than 0");
      bytes32 flightKey = getFlightKey(_airline, _flight, _timestamp);
      var (,isRegistered,,,) = dataContract.getFlight(flightKey);
      require(isRegistered, "The flight must be registered");
      dataContract.buy.value(msg.value)(flightKey, msg.sender);
    }

    function withdraw
      (
       address airline,
       string flight,
       uint256 timestamp       
      )
      external
      requireIsOperational
      payable {
      bytes32 flightKey = getFlightKey(airline, flight, timestamp);
      var (,isRegistered,statusCode,,) = dataContract.getFlight(flightKey);
      require(isRegistered, "The flight must be registered");
      require(statusCode > STATUS_CODE_ON_TIME, "The flight is not late");
      uint256 insuredAmount = dataContract.fetchInsuredAmount(msg.sender, flightKey);
      require(insuredAmount > 0, "Insured amount must be greater than 0");
      /* dataContract.setInsuredAmount(msg.sender, flightKey, 0); */
      uint256 payoutAmount = insuredAmount.mul(15).div(10);
      uint256 airlineFundDeduction = payoutAmount.sub(insuredAmount);
      dataContract.pay(msg.sender, payoutAmount, airlineFundDeduction, flightKey);
    }
    
   /**
    * @dev Called after oracle has updated flight status
    *
    */  
    function processFlightStatus
      (
       address airline,
       string memory flight,
       uint256 timestamp,
       uint8 statusCode
       )
      internal
    {
      bytes32 flightKey = getFlightKey(airline, flight, timestamp);
      dataContract.creditInsurees(flightKey, statusCode);
    }

    // Generate a request for oracles to fetch flight information
    function fetchFlightStatus
                        (
                            address airline,
                            string flight,
                            uint256 timestamp                            
                        )
                        external
      requireIsOperational
    {
        uint8 index = getRandomIndex(msg.sender);

        // Generate a unique key for storing the request
        bytes32 key = getFlightKeyForOracle(index, airline, flight, timestamp);
        oracleResponses[key] = ResponseInfo({
                                                requester: msg.sender,
                                                isOpen: true
                                            });

        emit OracleRequest(index, airline, flight, timestamp);
    }

    function getFlightKeyForOracle
      (
       uint8 index,
       address airline,
       string memory flight,
       uint256 timestamp
       )
      pure
      internal
      returns(bytes32) 
    {
      return keccak256(abi.encodePacked(index, airline, flight, timestamp));
    }


// region ORACLE MANAGEMENT

    // Incremented to add pseudo-randomness at various points
    uint8 private nonce = 0;    

    // Fee to be paid when registering oracle
    uint256 public constant REGISTRATION_FEE = 1 ether;

    // Number of oracles that must respond for valid status
    uint256 private constant MIN_RESPONSES = 3;


    struct Oracle {
        bool isRegistered;
        uint8[3] indexes;        
    }

    // Track all registered oracles
    mapping(address => Oracle) private oracles;

    // Model for responses from oracles
    struct ResponseInfo {
        address requester;                              // Account that requested status
        bool isOpen;                                    // If open, oracle responses are accepted
        mapping(uint8 => address[]) responses;          // Mapping key is the status code reported
                                                        // This lets us group responses and identify
                                                        // the response that majority of the oracles
    }

    // Track all oracle responses
    // Key = hash(index, flight, timestamp)
    mapping(bytes32 => ResponseInfo) private oracleResponses;

    // Event fired each time an oracle submits a response
    event FlightStatusInfo(address airline, string flight, uint256 timestamp, uint8 status);

    event OracleReport(address airline, string flight, uint256 timestamp, uint8 status);

    // Event fired when flight status request is submitted
    // Oracles track this and if they have a matching index
    // they fetch data and submit a response
    event OracleRequest(uint8 index, address airline, string flight, uint256 timestamp);


    // Register an oracle with the contract
    function registerOracle
                            (
                            )
                            external
                            payable
    {
        // Require registration fee
        require(msg.value >= REGISTRATION_FEE, "Registration fee is required");

        uint8[3] memory indexes = generateIndexes(msg.sender);

        oracles[msg.sender] = Oracle({
                                        isRegistered: true,
                                        indexes: indexes
                                    });
    }

    function getMyIndexes
                            (
                            )
                            view
                            external
                            returns(uint8[3])
    {
        require(oracles[msg.sender].isRegistered, "Not registered as an oracle");

        return oracles[msg.sender].indexes;
    }




    // Called by oracle when a response is available to an outstanding request
    // For the response to be accepted, there must be a pending request that is open
    // and matches one of the three Indexes randomly assigned to the oracle at the
    // time of registration (i.e. uninvited oracles are not welcome)
    function submitOracleResponse
                        (
                            uint8 index,
                            address airline,
                            string flight,
                            uint256 timestamp,
                            uint8 statusCode
                        )
                        external
    {
        require((oracles[msg.sender].indexes[0] == index) || (oracles[msg.sender].indexes[1] == index) || (oracles[msg.sender].indexes[2] == index), "Index does not match oracle request");


        bytes32 key = keccak256(abi.encodePacked(index, airline, flight, timestamp)); 
        require(oracleResponses[key].isOpen, "Oracle request has been timed-out");

        oracleResponses[key].responses[statusCode].push(msg.sender);

        // Information isn't considered verified until at least MIN_RESPONSES
        // oracles respond with the *** same *** information
        emit OracleReport(airline, flight, timestamp, statusCode);
        if (oracleResponses[key].responses[statusCode].length >= MIN_RESPONSES) {
            emit FlightStatusInfo(airline, flight, timestamp, statusCode);

            // Handle flight status as appropriate
            processFlightStatus(airline, flight, timestamp, statusCode);
	    oracleResponses[key].isOpen = false;
        }
    }


    function getFlightKey
                        (
                            address airline,
                            string flight,
                            uint256 timestamp
                        )
                        pure
                        internal
                        returns(bytes32) 
    {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    // Returns array of three non-duplicating integers from 0-9
    function generateIndexes
                            (                       
                                address account         
                            )
                            internal
                            returns(uint8[3])
    {
        uint8[3] memory indexes;
        indexes[0] = getRandomIndex(account);
        
        indexes[1] = indexes[0];
        while(indexes[1] == indexes[0]) {
            indexes[1] = getRandomIndex(account);
        }

        indexes[2] = indexes[1];
        while((indexes[2] == indexes[0]) || (indexes[2] == indexes[1])) {
            indexes[2] = getRandomIndex(account);
        }

        return indexes;
    }

    // Returns array of three non-duplicating integers from 0-9
    function getRandomIndex
                            (
                                address account
                            )
                            internal
                            returns (uint8)
    {
        uint8 maxValue = 10;

        // Pseudo random number...the incrementing nonce adds variation
        uint8 random = uint8(uint256(keccak256(abi.encodePacked(blockhash(block.number - nonce++), account))) % maxValue);

        if (nonce > 250) {
            nonce = 0;  // Can only fetch blockhashes for last 256 blocks so we adapt
        }

        return random;
    }

// endregion

}   

contract FlightSuretyData {
  
  function registerAirline(address, uint8, address[]) external;
  function fetchAirline(address) external view returns(uint8, address[], bool);
  function numberOfRegisteredAirlines() external view returns(uint256);
  function getAirline(address) public returns (bool, uint8, address[], uint256);
  function getFlight(bytes32) public returns (string, bool, uint8, uint256, address);
  function registerFlight(string, bool, uint8, uint256, address) external;
  function buy(bytes32, address) external payable;
  function creditInsurees(bytes32, uint8) external;
  function pay(address, uint256, uint256, bytes32) external payable;
  function fund() public payable;
  function fetchInsuredAmount(address, bytes32) external view returns(uint256);
  function setInsuredAmount(address, bytes32, uint256) external;
}
