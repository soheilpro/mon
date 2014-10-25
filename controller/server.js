var http = require("http");
var Messenger = require("../messenger.js");

function ServerController(DataSource, argv) {
  var _this = this;

  _this.DataSource = DataSource;
  _this.argv = argv;
  _this.port = argv.port;
}

ServerController.prototype.run = function() {
  var _this = this;

  http.createServer(function (request, response) {
    var requestMessenger = new Messenger(request);

    request.on("close", function() {
      _this.dataSource.stop();
    });

    requestMessenger.once("message", function(message) {
      var config = JSON.parse(message);
      var responseMessenger = new Messenger(response);

      _this.dataSource = new _this.DataSource(_this.argv);

      _this.dataSource.on("error", function(error) {
        console.error(error);
      });

      _this.dataSource.on("snapshot", function(snapshot) {
        responseMessenger.send(JSON.stringify(snapshot));
      });

      _this.dataSource.start(config);

      response.writeHead(200);
    });
  }).listen(_this.port);
}

module.exports = ServerController;
