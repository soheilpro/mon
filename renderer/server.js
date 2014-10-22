var http = require('http');

function ServerRenderer(dataSource, port) {
  this.dataSource = dataSource;
  this.port = port;
}

ServerRenderer.prototype.start = function() {
  var _this = this;

  http.createServer(function (request, response) {
    request.once("data", function(chunk) {
      var config = JSON.parse(chunk);

      response.writeHead(200);

      _this.dataSource.on("error", function(error) {
        console.error(error);
      });

      _this.dataSource.on("snapshot", function(snapshot) {
        response.write(JSON.stringify(snapshot));
      });

      _this.dataSource.start(config);
    });
  }).listen(this.port);
}

module.exports = ServerRenderer;
