var fs = require("fs");
var colors = require("colors");
var numeral = require("numeral");
var _ = require("underscore");

function ConsoleController(dataSource, argv) {
  var _this = this;

  _this.dataSource = dataSource;
  _this.config = JSON.parse(fs.readFileSync(argv._[0]).toString());
}

ConsoleController.prototype.run = function() {
  var _this = this;

  cls();

  process.on("SIGINT", function() {
    _this.dataSource.stop();
  });

  _this.dataSource.on("error", function(error) {
    console.error(error);
  });

  _this.dataSource.on("snapshot", function(snapshot) {
    cls();

    var groups = _.chain(snapshot.groups).map(function(group) { return group.name }).value();
    var counters = _.chain(snapshot.groups).map(function(group) { return group.counters }).flatten().map(function(counter) { return counter.name }).value();
    var maxNameLength = _.max(_.union(groups, counters), function(item) { return item.length }).length;
    var maxColumns = _.chain(snapshot.groups).max(function(group) { return group.column }).value().column;
    var columnWidth = process.stdout.columns / maxColumns;

    console.log(snapshot.host + " @ " + new Date(snapshot.time));
    console.log();

    for (var i = 0; i <= maxColumns; i++) {
      var columnX = Math.floor((i - 1) * columnWidth);
      process.stdout.cursorTo(0, 2);

      _.where(snapshot.groups, {column: i}).forEach(function(group) {
        var indentation = repeat(" ", maxNameLength - group.name.length + 2);
        process.stdout.cursorTo(columnX);
        console.log(indentation + group.name.cyan);

        group.counters.forEach(function(counter) {
          var indentation = repeat(" ", maxNameLength - counter.name.length + 1);
          var color = thresholdToColor(counter.threshold);

          process.stdout.cursorTo(columnX);
          console.log(indentation + counter.name + ": " + color(numeral(counter.value).format(counter.format)));
        });

        console.log();
      });
    };
  });

  _this.dataSource.start(_this.config);
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
