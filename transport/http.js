var util = require("util");
var events = require("events");
var http = require("http");

function Connection(output) {
  var _this = this;

  _this.output = output;
}

util.inherits(Connection, events.EventEmitter);

Connection.prototype.id = function() {
  var _this = this;

  if (!_this._id)
    _this._id = _this.output.headers ? _this.output.headers['x-forwarded-for'] : null ||
                _this.output.connection.remoteAddress ||
                _this.output.socket.remoteAddress ||
                _this.output.connection.socket.remoteAddress;

  return _this._id;
};

Connection.prototype.write = function(data) {
  var _this = this;

  if (_this.output instanceof http.ServerResponse)
    if (!_this.output.headersSent)
      _this.output.writeHead(200);

  _this.output.write(data);
};

Connection.prototype.close = function() {
  var _this = this;

  _this.output.end();

  if (_this.output.connection)
    _this.output.connection.end();
};

function HTTPTransport(options) {
  var _this = this;

  _this.options = options;
}

util.inherits(HTTPTransport, events.EventEmitter);

HTTPTransport.prototype.connect = function() {
  var _this = this;

  var options = {
    hostname: _this.options.server.hostname,
    port: _this.options.server.port,
    method: "POST"
  };

  var request = http.request(options);
  var connection = new Connection(request);

  request.on("response", function(response) {
    if (response.statusCode != 200) {
      connection.emit("error", new Error("Server returned status code " + response.statusCode));
      return;
    }

    response.on("data", function(data) {
      connection.emit("data", data);
    });

    request.connection.on("close", function() {
      connection.emit("close");
    });
  });

  request.on("error", function(error) {
    connection.emit("error", error);
  });

  _this.emit("connect", connection);
};

HTTPTransport.prototype.listen = function() {
  var _this = this;

  var server = http.createServer();

  server.on("request", function(request, response) {
    var connection = new Connection(response);

    request.on("data", function(data) {
      connection.emit("data", data);
    });

    request.connection.on("close", function() {
      connection.emit("close");
    });

    _this.emit("connect", connection);
  });

  server.listen(_this.options.port);
}

module.exports = HTTPTransport;
