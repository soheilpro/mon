var util = require("util");
var events = require("events");
var http = require('http');

function RemoteDataSource(address, port) {
  this.address = address;
  this.port = port;
}

util.inherits(RemoteDataSource, events.EventEmitter);

RemoteDataSource.prototype.start = function(config) {
  var _this = this;

  var options = {
    hostname: this.address,
    port: this.port,
    method: 'POST'
  };

  var request = http.request(options, function(response) {
    if (response.statusCode != 200) {
      console.error('Failed to connect.');
      return;
    }

    response.on('error', function(error) {
      _this.emit("error", error);
    });

    response.on('data', function(chunk) {
      var snapshot = JSON.parse(chunk);
      _this.emit("snapshot", snapshot);
    });
  });

  request.on("error", function(error) {
    console.error(error);
  });

  request.write(JSON.stringify(config));
  request.end();
};

module.exports = RemoteDataSource;