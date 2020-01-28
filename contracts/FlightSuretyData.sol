pragma solidity ^0.4.25;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

contract FlightSuretyData {
  using SafeMath for uint256;

  /********************************************************************************************/
  /*                                       DATA VARIABLES                                     */
  /********************************************************************************************/

  address private contractOwner;                                      // Account used to deploy contract
  bool private operational = true;                                    // Blocks all state changes throughout the contract if false
  mapping(address => uint256) private authorizedContracts; // Store authorized app address allowed to access this data contract

  // Airlines 
  uint8 private constant AIRLINE_UNKNOWN = 0;
  uint8 private constant AIRLINE_PENDING = 1;
  uint8 private constant AIRLINE_REGISTERED = 2;
  uint8 private constant AIRLINE_FUNDED = 3;
  struct Airline {
    uint8 statusCode;
    address[] votes;
    uint256 fund;
  }
  mapping(address => Airline) public airlines;
  uint256 public numberOfRegisteredAirlines = 0;

  // Flights
  struct Flight {
    string flight;
    bool isRegistered;
    uint8 statusCode;
    uint256 updatedTimestamp;        
    address airline;
  }
  mapping(bytes32 => Flight) public flights;

  // Insurance
  mapping(address => mapping(bytes32 => uint256)) private insurance;

  
  /********************************************************************************************/
  /*                                       EVENT DEFINITIONS                                  */
  /********************************************************************************************/


  /**
   * @dev Constructor
   *      The deploying account becomes contractOwner
   */
  constructor
    (
                                ) 
    public 
    {
      contractOwner = msg.sender;
      _registerAirline(contractOwner, 0, new address[](0));
    }

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
    require(operational, "Contract is currently not operational");
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

  modifier requireIsCallerAuthorized()
  {
    require(authorizedContracts[msg.sender] == 1, "Caller is not allowed to access this data contract");
    _;
  }

  /* modifier requireFlightIsRegistered(bytes32 key){ */
  /*   require(flights[key].isRegistered, "Flight must be registered") */
  /*   _; */
  /* } */

  /********************************************************************************************/
  /*                                       UTILITY FUNCTIONS                                  */
  /********************************************************************************************/

  /**
   * @dev Get operating status of contract
   *
   * @return A bool that is the current operating status
   */      
  function isOperational() 
    public 
    view 
    returns(bool) 
  {
    return operational;
  }


  /**
   * @dev Sets contract operations on/off
   *
   * When operational mode is disabled, all write transactions except for this one will fail
   */    
  function setOperatingStatus
    (
     bool mode
     ) 
    external
    requireContractOwner 
  {
    operational = mode;
  }

  // functions to allow owner to manipulate authorized app contracts
  function authorizeContract
    (
     address contractAddress
     )
    external
    requireContractOwner
  {
    authorizedContracts[contractAddress] = 1;
  }

  function deauthorizeContract
    (
     address contractAddress
     )
    external
    requireContractOwner
  {
    delete authorizedContracts[contractAddress];
  }

  /********************************************************************************************/
  /*                                     SMART CONTRACT FUNCTIONS                             */
  /********************************************************************************************/

  /**
   * @dev Add an airline to the registration queue
   *      Can only be called from FlightSuretyApp contract
   *
   */   
  function registerAirline
    (
     address _airline,
     uint8 _statusCode,
     address[] _votes
                            )
    external
    requireIsOperational
    requireIsCallerAuthorized
  {
    _registerAirline(_airline, _statusCode, _votes);
  }

  function _registerAirline
    (
     address _airline,
     uint8 _statusCode,
     address[] _votes
     )
    internal
  {
    airlines[_airline].statusCode = _statusCode;
    airlines[_airline].votes = _votes;
    if(_statusCode == AIRLINE_REGISTERED){
      numberOfRegisteredAirlines = numberOfRegisteredAirlines.add(1);
    }
  }

  function fetchAirline
    (
     address _airline
     ) external
    requireIsOperational
    requireIsCallerAuthorized
    view
    returns(uint8 statusCode, address[] votes){
    statusCode = airlines[_airline].statusCode;
    votes = airlines[_airline].votes;
  }

  function registerFlight
    (
     string _flight,
     bool _isRegistered,
     uint8 _statusCode,
     uint256 _updatedTimestamp,
     address _airline
     ) external
    requireIsOperational
    requireIsCallerAuthorized
  {
    bytes32 key = getFlightKey(_airline, _flight, _updatedTimestamp);
    require(!flights[key].isRegistered, "The flight has been registered already");
    flights[key] = Flight({
          flight: _flight,
	  isRegistered: _isRegistered,
	  statusCode: _statusCode,
	  updatedTimestamp: _updatedTimestamp,        
	  airline: _airline
	});
  }


  /**
   * @dev Buy insurance for a flight
   *
   */
  function buy
    (bytes32 flightKey,
     address insuree)
    external
    requireIsOperational
    requireIsCallerAuthorized
    payable
  {
    insurance[insuree][flightKey] = msg.value;
  }

  /**
   *  @dev Credits payouts to insurees
   */
  function creditInsurees
    (
                                )
    external
    pure
  {
  }
    

  /**
   *  @dev Transfers eligible payout funds to insuree
   *
   */
  function pay
    (
                            )
    external
    pure
  {
  }

  /**
   * @dev Initial funding for the insurance. Unless there are too many delayed flights
   *      resulting in insurance payouts, the contract should be self-sustaining
   *
   */   
  function fund
    ()
    public
    payable
  {
    require(airlines[msg.sender].statusCode == AIRLINE_REGISTERED, "Airline must be registered first before funding");
    require(msg.value >= 10 ether, "Fund must be greater or equals to 10 ether");
    airlines[msg.sender].fund = msg.value;
    airlines[msg.sender].statusCode = AIRLINE_FUNDED;
  }

  function getFlightKey
    (
     address airline,
     string memory flight,
     uint256 timestamp
     )
    pure
    internal
    returns(bytes32) 
  {
    return keccak256(abi.encodePacked(airline, flight, timestamp));
  }

  /**
   * @dev Fallback function for funding smart contract.
   *
   */
  function() 
    external 
    payable 
    {
      fund();
    }


}

