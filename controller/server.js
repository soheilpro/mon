var http = require("http");
var LocalDataSource = require("../datasource/local.js");
var Messenger = require("../messenger.js");
var Config = require("../config.js");

function ServerController(port) {
  var _this = this;

  _this.port = port;
}

ServerController.prototype.run = function() {
  var _this = this;

  http.createServer(function (request, response) {
    console.log("Client connected: " + request.connection.remoteAddress);

    var requestMessenger = new Messenger(request);
    var dataSource;

    request.on("close", function() {
      console.log("Client disconnected: " + request.connection.remoteAddress);

      if (dataSource)
        dataSource.stop();
    });

    requestMessenger.once("message", function(message) {
      var config = Config.parse(message).instantiate();
      var responseMessenger = new Messenger(response);

      dataSource = new LocalDataSource();

      dataSource.on("error", function(error) {
        console.error(error);
      });

      dataSource.on("snapshot", function(snapshot) {
        responseMessenger.send(JSON.stringify(snapshot));
      });

      dataSource.start(config);

      response.writeHead(200);
    });
  }).listen(_this.port);

  console.log("Started server on port " + _this.port);
}

module.exports = ServerController;
