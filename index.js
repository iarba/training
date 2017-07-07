const request = require('request');
const readline = require('readline');
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});
const ClosestToSoftwire = '490008660N';
const SoftwireCode = 'NW5 1TL';

function nop(x){};

function getByStopId(stopId)
{
    new Promise((resolve, reject) => {
        request('https://api.tfl.gov.uk/StopPoint/' + stopId + '/Arrivals', 
            function parseByStopId(err, status, body){
            if(err){
                reject(err);
            }
            if(status.statusCode !== 200){
                reject("Unexpected status code:" + status.statusCode);
            }
            data = JSON.parse(body);
            var busList = [];
            for(var entryId in data){
                entry = data[entryId];
                bus = new Bus(entry.lineId, entry.towards, entry.timeToStation, entry.destinationName);
                busList.push(bus);
            }
            busList.id = stopId;
            resolve(busList);
        });
    }).then(printBusses).catch(err => {console.log(err);});
}

function getByPostId(postCode){
    new Promise((resolve, reject) => {
        request('https://api.postcodes.io/postcodes/' + postCode,
        function parseByPostCode(err, status, body){
            if(err){
                reject(err)
            }
            if(status.statusCode !== 200){
                reject('bad query: ' + status.statusCode);
                return;
            }
            data = JSON.parse(body).result;
            location = new Location(data.longitude,data.latitude);
            resolve(getByLocation(location));
        });
    }).then(nop).catch(err => {console.log(err);});
}

function getByLocation(location){
    rad = 300;
    new Promise((resolve, reject) => {
        request("https://api.tfl.gov.uk/StopPoint?stopTypes=NaptanBusCoachStation%2CNaptanBusWayPoint%2CNaptanPrivateBusCoachTram%2C%20NaptanPublicBusCoachTram&radius=" + rad + "&modes=bus&lat=" + location.latitude + "&lon=" + location.longitude, 
        function parseByLocation(err, status, body){
            if(err){
                reject(err);
            }
            if(status.statusCode !== 200){
                reject("bad query: " + status.statusCode);
            }
            data = JSON.parse(body);
            data.stopPoints.sort(function(a,b){
                return a.distance - b.distance;
            });
            getByStopId(data.stopPoints[0].id);
            getByStopId(data.stopPoints[1].id);
            resolve(42);
        });
    }).then(nop).catch(err => {console.log(err);});
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
                case 'COMPANY':
                    argument = SoftwireCode;
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
    console.log("Buses arriving at station " + list.id);
    list.sort(Bus.comparator);
    for(var busId in list){
        if(busId >= 5) {
            break;
        }
        bus = list[busId];
        console.log(bus.toString());
    }
}

function secToMin(seconds){
    return (seconds / 60).toFixed(2)
}

class Bus {
    constructor(id, route, timeToArrival, destination){
        this.id = id;
        this.route = route;
        this.timeToArrival = timeToArrival;
        this.destination = destination;
    }

    toString(){
        return "Bus [" + this.id + "] towards " + this.destination + " via " + this.route + " expected to arrive in " + secToMin(this.timeToArrival) + " minutes.";
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