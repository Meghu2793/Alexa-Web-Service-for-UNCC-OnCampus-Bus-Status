// Javascript code in Node-Express web framework
// Developed a Web Service by Web Scraping the https://nextride.uncc.edu to get the status of UNCC-onCampus 
// bus status
// This code would be integrated to AWS Lmabda function to connect to ALEXA
// Defualt Input given here is : "SILVER ROUTE"
// It will fetch the silver route bus status (How many busses are running and where all busses stops 
// are) 
// https response is generated to make the server more secured. 
// IDE : Visual Studio Code


//Sample Output : There are 4 Silver busses running on-campus
// [
//   "(22) Grigg Hall West",
//   "(1) CRI Deck",
//   "(7) Woodward Hall East",
//   "(12) Martin Hall"
// ]

const https = require("https");
var fs = require('fs');
const express = require("express");
var port = 8080;
const app = express();

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

//Certificate for HTTPS 
var options = {
  key: fs.readFileSync( '../localhost.key' ),
  cert: fs.readFileSync( '../localhost.cert' ),
  requestCert: false,
  rejectUnauthorized: false
};

var route_input = "Silver (Cross Campus)";

// GET request to https://localhost8080/getTheStatus 
app.get("/getTheStatus", function(req, response) {
  let results = "";
  var vehicleStopTimeAndRouteIDs = [];
  var runningBussesIds = [];
  let speech_Output = [];
  var numberOfBussesRunning;
  https
    .get(
      "https://nextride.uncc.edu/Services/JSONPRelay.svc/GetRoutesForMapWithScheduleWithEncodedLine",
      res => {
        res.on("data", data => {
          results += data;
        });
        res.on("end", () => {
          results = JSON.parse(results);
          for (var i = 0; i < results.length; i++) {
            if (results[i].Description == route_input) {
              var routeIDInput = results[i].RouteID;
              https.get(
                "https://nextride.uncc.edu/Services/JSONPRelay.svc/GetRouteStopArrivals",
                res => {
                  let results1 = "";
                  res.on("data", data1 => {
                    results1 += data1;
                  });
                  res.on("end", () => {
                    let routeStopIDArray = [];
                    speech_Output = [];
                    results1 = JSON.parse(results1);
                    for (var j = 0; j < results1.length; j++) {
                      if (results1[j].RouteID == routeIDInput) {
                        numberOfBussesRunning =
                          results1[j].VehicleEstimates.length;

                        for (var k = 0; k < numberOfBussesRunning; k++) {
                          if (
                            runningBussesIds.indexOf(
                              results1[j].VehicleEstimates[k].VehicleID
                            ) == -1
                          )
                            runningBussesIds.push(
                              results1[j].VehicleEstimates[k].VehicleID
                            );
                          if (
                            results1[j].VehicleEstimates[k].SecondsToStop ==
                              0 ||
                            results1[j].VehicleEstimates[k].SecondsToStop <= 59
                          ) {
                            var temp = {};
                            temp.StopID = results1[j].RouteStopID;
                            temp.StopTime =
                              results1[j].VehicleEstimates[k].SecondsToStop;
                            temp.vehicleID =
                              results1[j].VehicleEstimates[k].VehicleID;
                            vehicleStopTimeAndRouteIDs.push(temp);
                          }
                        }
                      }
                    }
                    for (
                      var i = 0;
                      i < vehicleStopTimeAndRouteIDs.length;
                      i++
                    ) {
                      for (var j = 0; j < results.length; j++) {
                        if (results[j].RouteID == routeIDInput) {
                          var result3 = results[j];
                          for (var k = 0; k < result3.Stops.length; k++) {
                            if (
                              vehicleStopTimeAndRouteIDs[i].StopID ==
                              result3.Stops[k].RouteStopID
                            ) {
                              speech_Output.push(
                                results[j].Stops[k].Description
                              );
                            }
                          }
                        }
                      }
                    }
                    response.send(speech_Output);
                  });
                }
              );
            }
          }
        });
      }
    )
    .on("error", e => {
      console.error(e);
    });
});

var server = https.createServer( options, app ).listen(port);