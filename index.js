var request = require('request');

request('https://api.tfl.gov.uk/StopPoint/490008660N/Arrivals',parse);

function printBusses(list){
    list.sort(Bus.comparator);
    for(var busId in list){//limit to at most 5
        bus = list[busId];
        console.log(bus.toString());
    }
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
    for(var entryId in data){
        entry = data[entryId];
        bus = new Bus(entry.towards, entry.timeToStation, entry.destinationName);
        busList.push(bus);
    }

    printBusses(busList);
}

function secToMin(seconds){
    return (seconds / 60).toFixed(2)
}

class Bus {
    constructor(route, timeToArrival, destination){
        this.route = route;
        this.timeToArrival = timeToArrival;
        this.destination = destination;
    }

    toString(){
        return "Bus towards " + this.destination + " via " + this.route + " expected to arrive in " + secToMin(this.timeToArrival) + " minutes.";
    }

    static comparator(bus1, bus2){
        return bus1.timeToArrival - bus2.timeToArrival;
    }
}