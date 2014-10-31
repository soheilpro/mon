var fs = require("fs");
var util = require("util");
var events = require("events");
var http = require("http");
var Messenger = require("../messenger.js");

function RemoteDataSource(server) {
  var _this = this;

  _this.server = server;
}

util.inherits(RemoteDataSource, events.EventEmitter);

RemoteDataSource.prototype.start = function(config) {
  var _this = this;

  var options = {
    hostname: _this.server.hostname,
    port: _this.server.port,
    method: "POST"
  };

  var request = http.request(options, function(response) {
    if (response.statusCode != 200) {
      console.error("Failed to connect.");
      return;
    }

    var responseMessenger = new Messenger(response);

    response.on("error", function(error) {
      _this.emit("error", error);
    });

    responseMessenger.on("message", function(message) {
      var snapshot = JSON.parse(message);
      _this.emit("snapshot", snapshot);
    });
  });

  request.on("error", function(error) {
    console.error(error);
  });

  var requestMessenger = new Messenger(request);
  requestMessenger.send(JSON.stringify(config));
  request.end();

  _this.request = request;

  _this.emit("start");
};

RemoteDataSource.prototype.stop = function() {
  var _this = this;

  if (_this.request)
    _this.request.abort();

  _this.emit("stop");
};

module.exports = RemoteDataSource;