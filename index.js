const request = require('request');
const readline = require('readline');
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});
const ClosestToSoftwire = '490008660N';

function getByStopId(stopId)
{
    request('https://api.tfl.gov.uk/StopPoint/' + stopId + '/Arrivals',parseByStopId);
}
//-------------------------------------------test
//request('https://api.postcodes.io/postcodes/' + postCode, parseByPostCode)
//-------------------------------------------test
function getByPostId(postCode){
    request('https://api.postcodes.io/postcodes/' + postCode, parseByPostCode)
}

function interpretLine(line){
    tokens = line.split(/ +/);
    key = tokens[0].toUpperCase();
    switch (key) {
        case 'BY':
            key2 = tokens[1].toUpperCase();
            argument = tokens[2];
            action = undefined;
            switch (key2){
                case 'SOFTWIRE':
                    argument = ClosestToSoftwire;
                case 'STOP':
                    action = getByStopId;
                    break;
                case 'POST':
                    action = getByPostId;
                    break;
                default:
                    console.log('invalid input');
            }
            if(action != undefined){
                action(argument);
            }
            break;
        case 'EXIT':
            rl.close();
            break;
        default:
            console.log('invalid input');
    }
}

function printBusses(list){
    list.sort(Bus.comparator);
    for(var busId in list){
        if(busId >= 5) {
            break;
        }
        bus = list[busId];
        console.log(bus.toString());
    }
}

function parseByStopId(err, status, body){
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

function parseByPostCode(err, status, body){
    if(err){
        console.log(err);
        return;
    }
    if(status.statusCode !== 200){
        console.log('bad query: ',status.statusCode);
        return;
    }
    //console.log(body);
    data = JSON.parse(body).result;
    location = new Location(data.longitude,data.latitude);
    console.log(location.longitude, '  ', location.latitude);
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

function main(){
    rl.on('line', interpretLine);
}

class Location {
    constructor(longitude, latitude){
        this.longitude = longitude;
        this.latitude = latitude;
    }
}

main();