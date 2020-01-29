
import DOM from './dom';
import Contract from './contract';
import './flightsurety.css';

function now(){
    return Math.floor(Date.now() / 1000);
}

(async() => {

	let result = null;

	let contract = new Contract('localhost', () => {

            // Read transaction
            contract.isOperational((error, result) => {
		console.log(error,result);
		display('Operational Status', 'Check if contract is operational', [ { label: 'Operational Status', error: error, value: result} ]);
            });

	    let flights = [{
		airline: contract.airlines[0],
		flight: "TG1001",
		timestamp: now()
	    },{
		airline: contract.airlines[0],
		flight: "TG1002",
		timestamp: now()
	    },{
		airline: contract.airlines[1],
		flight: "AA1111",
		timestamp: now()
	    },{
		airline: contract.airlines[2],
		flight: "BB2222",
		timestamp: now()
	    }];
	    
	    contract.registerAirlines((error, airlines) => {
		flights.forEach((flight => {
		    contract.registerFlight(flight.airline,flight.flight,flight.timestamp, (error, result) => {
			if(error != null)console.log(error);
			console.log(result);
		    });
		}));
		
	    });

	    // User-submitted transaction
	    DOM.elid('submit-oracle').addEventListener('click', () => {
		let flight = DOM.elid('flight-number').value;
		// Write transaction
		contract.fetchFlightStatus(flight, (error, result) => {
		    display('Oracles', 'Trigger oracles', [ { label: 'Fetch Flight Status', error: error, value: result.flight + ' ' + result.timestamp} ]);
		});
	    });
	    
	});
	    

	})();


	function display(title, description, results) {
	    let displayDiv = DOM.elid("display-wrapper");
	    let section = DOM.section();
	    section.appendChild(DOM.h2(title));
	    section.appendChild(DOM.h5(description));
	    results.map((result) => {
		let row = section.appendChild(DOM.div({className:'row'}));
		row.appendChild(DOM.div({className: 'col-sm-4 field'}, result.label));
		row.appendChild(DOM.div({className: 'col-sm-8 field-value'}, result.error ? String(result.error) : String(result.value)));
		section.appendChild(row);
	    })
	    displayDiv.append(section);

	}







