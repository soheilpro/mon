var http = require('http');
var HTTPTransport = require("../transport/http.js");
var LocalDataSource = require("../datasource/local.js");
var RemoteDataSource = require("../datasource/remote.js");
var _ = require("underscore");
var moment = require('moment');

function ElasticsearchController(server, config, elasticsearchConfig) {
  var _this = this;

  _this.server = server;
  _this.config = config;
  _this.elasticsearchConfig = elasticsearchConfig;

  _this.snapshots = [];
}

ElasticsearchController.prototype.run = function() {
  var _this = this;
  var dataSource;

  if (_this.server) {
    var transport = new HTTPTransport({ server: _this.server });
    dataSource = new RemoteDataSource(transport);
    console.log("Monitoring remote server " + _this.server.hostname + ":" + _this.server.port);
  }
  else {
    dataSource = new LocalDataSource();
    console.log("Monitoring local server");
  }

  console.log("Saving to Elasticsearch server " + _this.elasticsearchConfig.address + ":" + _this.elasticsearchConfig.port);

  process.on("SIGINT", function() {
    dataSource.stop();
    process.exit();
  });

  dataSource.on("error", function(error) {
    console.error(error);
  });

  dataSource.on("snapshot", function(snapshot) {
    _this.snapshots.push(snapshot);
  });

  dataSource.start(_this.config);

  _this.timer = setInterval((function(self) {
    return function() {
      self.saveSnapshots();
    };
  })(_this), 10 * 1000);
};

ElasticsearchController.prototype.saveSnapshots = function() {
  var _this = this;

  if (_this.snapshots.length === 0)
    return;

  var data = _this.createRequest(_this.snapshots);

  var options = {
    hostname: _this.elasticsearchConfig.address,
    port: _this.elasticsearchConfig.port,
    path: '/_bulk',
    method: 'POST',
    headers: {
      'Content-Length': data.length,
      'Content-Type': 'application/json',
    },
  };

  var request = http.request(options, function(response) {
    if (response.statusCode !== 200)
      return console.error('Error: ' + response.statusMessage);

    console.log('Saved ' + _this.snapshots.length + ' snapshots.');

    _this.snapshots = [];
  });

  request.on('error', function(error) {
    console.error(error);
  });

  request.end(data);
}

ElasticsearchController.prototype.createRequest = function(snapshots) {
  var _this = this;
  var data = '';

  for (var snapshot of snapshots) {
    snapshot = _this.transformSnapshot(snapshot);

    var index = _this.elasticsearchConfig.indexPrefix + moment.utc(snapshot['@timestamp']).format('YYYY.MM.DD');
    data += '{ "index" : { "_index" : "' + index + '", "_type" : "snapshot" } }\n';
    data += JSON.stringify(snapshot) + '\n';
  }

  return new Buffer(data, 'utf8');
}

ElasticsearchController.prototype.transformSnapshot = function(snapshot) {
  var _this = this;
  var document = {
    '@timestamp': new Date(snapshot.time),
    host: snapshot.host,
  };

  _.each(snapshot.groups, function(group) {
    _.each(group.counters, function(counter) {
      document[group.name + ': ' + counter.name] = counter.value;
    });
  });

  return document;
}

module.exports = ElasticsearchController;
