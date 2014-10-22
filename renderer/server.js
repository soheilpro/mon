var http = require('http');
var Messenger = require('../messenger.js');

function ServerRenderer(dataSource, port) {
  this.dataSource = dataSource;
  this.port = port;
}

ServerRenderer.prototype.start = function() {
  var _this = this;

  http.createServer(function (request, response) {
    var requestMessenger = new Messenger(request);

    request.on("close", function() {
      _this.dataSource.stop();
    });

    requestMessenger.once("message", function(message) {
      var config = JSON.parse(message);
      var responseMessenger = new Messenger(response);

      response.writeHead(200);

      _this.dataSource.on("error", function(error) {
        console.error(error);
      });

      _this.dataSource.on("snapshot", function(snapshot) {
        responseMessenger.send(JSON.stringify(snapshot));
      });

      _this.dataSource.start(config);
    });
  }).listen(this.port);
}

ServerRenderer.prototype.stop = function() {
  this.dataSource.stop();
};

module.exports = ServerRenderer;
