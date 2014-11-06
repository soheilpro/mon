var HTTPTransport = require("../transport/http.js");
var LocalDataSource = require("../datasource/local.js");
var Config = require("../config.js");
var boundary = require("../boundary.js");

function ServerController(port) {
  var _this = this;

  _this.port = port;
}

ServerController.prototype.run = function() {
  var _this = this;

  var transport = new HTTPTransport({ port: _this.port });

  transport.on("connect", function(connection) {
    console.log("Client connected: " + connection.id());

    var connection = boundary.chunked(connection);
    var dataSource;

    connection.once("message", function(message) {
      var config = Config.parse(message).instantiate();
      dataSource = new LocalDataSource();

      dataSource.on("snapshot", function(snapshot) {
        connection.writeMessage(JSON.stringify(snapshot));
      });

      dataSource.on("error", function(error) {
        console.error(error);
      });

      dataSource.start(config);
    });

    connection.on("close", function() {
      console.log("Client disconnected: " + connection.id());

      if (dataSource)
        dataSource.stop();
    });
  });

  transport.listen();

  console.log("Started server on port " + _this.port);
}

module.exports = ServerController;
