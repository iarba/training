const request = require('request');
const readline = require('readline');
const express = require("express");
const fs = require("fs");
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});
const ClosestToSoftwire = '490008660N';
const SoftwireCode = 'NW5 1TL';
const NL = "\n";
const BR = "<br/>";
var server;

function nop(x){}

function getByStopId(stopId)
{
    return new Promise((resolve, reject) => {
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
    });
}

function getByPostId(postCode){
    return new Promise((resolve, reject) => {
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
            getByLocation(location).then((val) => resolve(val)).catch((val) => reject(val));
        });
    });
}

function getByLocation(location){
    rad = 300;
    return new Promise((resolve, reject) => {
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
            var stop1 = getByStopId(data.stopPoints[0].id);
            var stop2 = getByStopId(data.stopPoints[1].id);
            Promise.all([stop1, stop2]).then(busListList => {busListList.id = 0; resolve(busListList);})
        });
    });
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
                action(argument).then(busList => console.log(printBusses(busList))).catch(err => console.log(err));
            }
            break;
        case 'EXIT':
            server.close();
            rl.close();
            break;
        default:
            console.log('invalid input');
    }
}

function printBusses(list, sep = NL){
    if(list.id == 0){
        result = "";
        for(var listId in list){
            if(listId == "id"){
                continue;
            }
            result += printBusses(list[listId], sep);
        }
        return result;
    }
    result = "Buses arriving at station " + list.id + sep;
    list.sort(Bus.comparator);
    for(var busId in list){
        if(busId == "id"){
            continue;
        }
        if(busId >= 5) {
            break;
        }
        bus = list[busId];
        result += bus.toString() + sep;
    }
    return result;
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

class Location {
    constructor(longitude, latitude){
        this.longitude = longitude;
        this.latitude = latitude;
    }
}

function main(){
    server = express()
    .get('/', function (req, res){
        console.log("redirecting");
        extra = "";
        if(req._parsedUrl.search != null)
        {
            extra = req._parsedUrl.search;
        }
        res.redirect("/index.html" + extra);
    })
    .get('/index.html', function (req, res){
        header = "<!DOCTYPE html>";
        header += "<html><head><title>TFL Bus finder based on postcode?</title></head>";
        body = "<body><p>please input post code</p>";
        body += "<form action=\"/index.html\">";
        footer = "</body></html>";
        code = false;
        toPrint = SoftwireCode;
        if(req.query.postcode != undefined){
            code = req.query.postcode;
            toPrint = code;
        }
        body += "<input type=\"text\" name=\"postcode\" value=\"" + toPrint + "\">";
        body += "<input type=\"submit\" value=\"Submit\">";
        body += "</form>";
        if(code){
            getByPostId(req.query.postcode)
            .then((val) => {
                body += "<p>Results for: " + code + "</p>";
                body += "<p>" + printBusses(val, BR) + "</p>";
                res.send(header + body + footer);
            }).catch((err) => {
                console.log("rejected: ", err); 
                body += "<p>Error encountered: " + err + "</p>"; 
                res.send(header + body + footer);});
        } else{
            res.send(header + body + footer);
        }
    })
    .listen(3000, function () {
        var host = server.address().address;
        var port = server.address().port;
        console.log("Example app listening at http://%s:%s", host, port)
    });
    rl.on('line', interpretLine);
}

main();