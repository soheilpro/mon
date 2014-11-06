var fs = require("fs");
var util = require("util");
var events = require("events");
var boundary = require("../boundary.js");

function RemoteDataSource(transport) {
  var _this = this;

  _this.transport = transport;
}

util.inherits(RemoteDataSource, events.EventEmitter);

RemoteDataSource.prototype.start = function(config) {
  var _this = this;

  _this.transport.on("connect", function(connection) {
    var connection = boundary.chunked(connection);

    connection.writeMessage(config.toString());

    connection.on("error", function(error) {
      _this.emit("error", error);
    });

    connection.on("message", function(message) {
      var snapshot = JSON.parse(message);
      _this.emit("snapshot", snapshot);
    });

    _this.connection = connection;
  });

  _this.transport.connect();

  _this.emit("start");
};

RemoteDataSource.prototype.stop = function() {
  var _this = this;

  if (_this.connection)
    _this.connection.close();

  _this.emit("stop");
};

module.exports = RemoteDataSource;
