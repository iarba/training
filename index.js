var request = require('request');

request('https://api.tfl.gov.uk/StopPoint/490008660N/Arrivals',parse);


function parse(err, status, body){
    if(err){
        console.log(err);
        return;
    }
    if(status.statusCode !== 200){
        console.log('bad query: ',status.statusCode);
        return;
    }
    data = JSON.parse(body);
    bus = new Bus(data[0].towards, data[0].timeToStation,data[0].destinationName)
    console.log(bus);
}

class Bus {
    constructor(route, timeToArrival, destination){
        this.route = route;
        this.timeToArrival = timeToArrival;
        this.destination = destination;
    }
}