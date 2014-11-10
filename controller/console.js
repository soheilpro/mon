var HTTPTransport = require("../transport/http.js");
var LocalDataSource = require("../datasource/local.js");
var RemoteDataSource = require("../datasource/remote.js");
var colors = require("colors");
var numeral = require("numeral");
var _ = require("underscore");

function ConsoleController(server, config) {
  var _this = this;

  _this.server = server;
  _this.config = config;
}

ConsoleController.prototype.run = function() {
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

  process.on("SIGINT", function() {
    clearInterval(_this.timer);
    dataSource.stop();
    cls();
    process.exit();
  });

  dataSource.on("error", function(error) {
    console.error(error);
  });

  dataSource.on("snapshot", function(snapshot) {
    _this.snapshot = snapshot;
  });

  dataSource.start(_this.config);

  _this.timer = setInterval((function(self) {
    return function() {
      self.displaySnapshot();
    };
  })(_this), 1000);
};

ConsoleController.prototype.displaySnapshot = function() {
  var _this = this;

  if (!_this.snapshot)
    return;

  var delay = (new Date() - new Date(_this.snapshot.time)) / 1000;
  var delayColor;

  if (delay <= 3)
    delayColor = colors.bgGreen;
  else if (delay <= 5)
    delayColor = colors.bgYellow;
  else
    delayColor = colors.bgRed;

  var header = _this.snapshot.host + " / ".dim + new Date(_this.snapshot.time) + " / ".dim + delayColor(numeral(delay).format("0.00"));

  cls();

  process.stdout.cursorTo(Math.floor(process.stdout.columns / 2) - Math.floor(header.length / 2), 0);
  console.log(header);
  console.log();

  var maxColumns = _.chain(_this.snapshot.groups).max(function(group) { return group.column }).value().column;
  var columnWidth = process.stdout.columns / maxColumns;

  for (var i = 0; i <= maxColumns; i++) {
    var columnX = Math.floor((i - 1) * columnWidth);
    process.stdout.cursorTo(0, 2);

    _.where(_this.snapshot.groups, {column: i}).forEach(function(group) {
      var groups = _.chain(_this.snapshot.groups).where({column: i}).map(function(group) { return group.name }).value();
      var counters = _.chain(_this.snapshot.groups).where({column: i}).map(function(group) { return group.counters }).flatten().map(function(counter) { return counter.name }).value();
      var lists = _.chain(_this.snapshot.groups).where({column: i}).map(function(group) { return group.lists }).flatten().map(function(list) { return list.name }).value();
      var listItems = _.chain(_this.snapshot.groups).where({column: i}).map(function(group) { return group.lists }).flatten().map(function(list) { return list.items }).flatten().map(function(item) { return item.name }).value();
      var listStatItems = _.chain(_this.snapshot.groups).where({column: i}).map(function(group) { return group.lists }).flatten().map(function(list) { return list.stats }).flatten().compact().map(function(stat) { return stat.items }).flatten().map(function(item) { return item.name }).value();
      var maxNameLength = _.max(_.union(groups, counters, lists, listItems, listStatItems), function(name) { return name.length }).length;

      var indentation = maxNameLength - group.name.length + 2;
      process.stdout.cursorTo(columnX);
      console.log(repeat(" ", indentation) + group.name.cyan);

      group.counters.forEach(function(counter) {
        var indentation = maxNameLength - counter.name.length + 1;
        var color = thresholdToColor(counter.threshold);
        var value = numeral(counter.value).format(counter.format);
        var stats = "";

        if (counter.stats) {
          counter.stats.forEach(function(stat) {
            var indentation = maxNameLength - stat.name.length + 1;
            var color = thresholdToColor(stat.threshold);
            var value = numeral(stat.value).format(counter.format);

            process.stdout.cursorTo(columnX);
            stats += "  " + (stat.name + ": ").dim + color(value);
          });
        }

        process.stdout.cursorTo(columnX);
        console.log(repeat(" ", indentation) + counter.name + ": " + color(value) + stats);
      });

      group.lists.forEach(function(list) {
        var indentation = maxNameLength - list.name.length + 2;

        process.stdout.cursorTo(columnX);
        console.log(repeat(" ", indentation) + list.name.cyan);

        list.items.forEach(function(item) {
          var indentation = maxNameLength - item.name.length + 1;
          var color = thresholdToColor(item.threshold);
          var value = numeral(item.value).format(list.format);

          process.stdout.cursorTo(columnX);
          console.log(repeat(" ", indentation) + item.name + ": " + color(value));
        });

        console.log();

        if (list.stats) {
          list.stats.forEach(function(stat) {
            var indentation = maxNameLength - stat.name.length + 1;

            process.stdout.cursorTo(columnX);
            console.log(repeat(" ", indentation) + (stat.name + ": ").dim);

            stat.items.forEach(function(item) {
              var indentation = maxNameLength - item.name.length + 1;
              var color = thresholdToColor(item.threshold);
              var value = numeral(item.value).format(list.format);

              process.stdout.cursorTo(columnX);
              console.log(repeat(" ", indentation) + item.name + ": " + color(value));
            });

            console.log();
          });
        }
      });

      console.log();
    });
  };
};

module.exports = ConsoleController;

function thresholdToColor(threshold) {
  if (!threshold)
    return colors.reset;

  if (threshold.name == 'critical')
    return colors.bgRed;

  if (threshold.name == 'warning')
    return colors.bgYellow;

  return colors.reset;
}

function cls() {
  process.stdout.write("\u001B[2J\u001B[0;0f");
}

function repeat(str, num) {
  return new Array(num + 1).join(str);
}
