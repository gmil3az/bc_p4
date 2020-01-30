
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

	    let select = document.getElementById("flights-to-buy"); 
	    for(let i = 0; i < flights.length; i++) {
	    	let flight = flights[i];
	    	let el = document.createElement("option");
	    	el.textContent = `airline:${flight.airline}, flight:${flight.flight}, timestamp:${flight.timestamp}`;
	    	el.value = `${flight.airline}:${flight.flight}:${flight.timestamp}`;
                select.appendChild(el);
	    }
	    
	    contract.registerAirlines((error, airline) => {
		if(error != null){
		    console.log(`Failed to register Airline: ${airline} with error: ${error}`);
		}else{
		    console.log(`Airline: ${airline} have been registered successfully`);
		}
		contract.airlineFunding(airline, (error, airline) => {
		    if(error != null){
			console.log(`Failed to fund Airline: ${airline} with error: ${error}`);
		    }else{
			console.log(`Airline: ${airline} have been funded successfully`);
		    }
		});
	    });

	    flights.forEach((flight => {
		contract.registerFlight(flight.airline,flight.flight,flight.timestamp, (error, result) => {
		    if(error != null) {
			console.log(`Failed to register Flight: ${flight.flight} with error:${error}`);
		    }else{
			console.log(`Flight: ${flight.flight} has been registered successfully with result: ${result}`);
		    }
		});
	    }));

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







