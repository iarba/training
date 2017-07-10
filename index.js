const request = require('request');
const readline = require('readline');
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});
const postRegEx = new RegExp("^(([gG][iI][rR] {0,}0[aA]{2})|((([a-pr-uwyzA-PR-UWYZ][a-hk-yA-HK-Y]?[0-9][0-9]?)|(([a-pr-uwyzA-PR-UWYZ][0-9][a-hjkstuwA-HJKSTUW])|([a-pr-uwyzA-PR-UWYZ][a-hk-yA-HK-Y][0-9][abehmnprv-yABEHMNPRV-Y]))) {0,}[0-9][abd-hjlnp-uw-zABD-HJLNP-UW-Z]{2}))$");
const ClosestToSoftwire = '490008660N';
const SoftwireCode = 'NW5 1TL';
const NL = "\n";
const BR = "<br/>";
const displayedStops = 2;
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
            var busList = new BusList(stopId);
            for(var entryId in data){
                entry = data[entryId];
                bus = new Bus(entry.lineId, entry.towards, entry.timeToStation, entry.destinationName);
                busList.push(bus);
            }
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

            if(data.stopPoints.length > 0){
                var stops = [];
                data.stopPoints.sort(function(a,b){
                    return a.distance - b.distance;
                });
                for(var i in data.stopPoints){
                    if(i < displayedStops){
                        stops.push(getByStopId(data.stopPoints[i].id));
                    }
                }
                Promise.all(stops).then((busListList) => {busListList.id = 0; resolve(busListList);})
            }else{
                reject("no bus stops nearby");
            }
            
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
                action(argument).then(busList => console.log(BusList.printBusses(busList))).catch(err => console.log(err));
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

function secToMin(seconds){
    return (seconds / 60).toFixed(2)
}

class BusList {
    constructor(id){
        this.id = id;
        this.content = [];
    }

    push(value){
        this.content.push(value);
    }

    sort(funct){
        return this.content.sort(funct);
    }

    static printBusses(list, sep = NL){
        var result;
        if(list.id == 0){
            result = "";
            for(var listId in list){
                if(listId == "id"){
                    continue;
                }
                result += BusList.printBusses(list[listId], sep);
            }
            return result;
        }
        result = "Buses arriving at station " + list.id + sep;
        list.sort(Bus.comparator);
        for(var busId in list.content){
            if(busId == "id"){
                continue;
            }
            if(busId >= 5) {
                break;
            }
            bus = list.content[busId];
            result += bus.toString() + sep;
        }
        return result;
    }
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
    .use(cors())
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
                body += "<p>" + BusList.printBusses(val, BR) + "</p>";
                res.send(header + body + footer);
            }).catch((err) => {
                console.log("rejected: ", err); 
                body += "<p>Error encountered: " + err + "</p>"; 
                res.send(header + body + footer);});
        } else{
            res.send(header + body + footer);
        }
        //setTimeout("location.reload(true);",5000);
    })
    .get("/postcode", function(req, res){
        code = req.query.postcode;
        if(code != undefined){
            if(postRegEx.test(code)){
                getByPostId(code).then((val) => {res.send(val);});
            }  
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