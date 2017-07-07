var request = require('request');

request('https://api.tfl.gov.uk/StopPoint/490008660N/Arrivals',parse);

function printBusses(list)
{
    console.log(list);
}

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
    var busList = [];
    for(var entryId in data)
    {
        entry = data[entryId];
        bus = new Bus(entry.towards, entry.timeToStation, entry.destinationName);
        busList.push(bus);
    }

    printBusses(busList);
}

class Bus {
    constructor(route, timeToArrival, destination){
        this.route = route;
        this.timeToArrival = timeToArrival;
        this.destination = destination;
    }
}