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
    var lists = _.chain(snapshot.groups).map(function(group) { return group.lists }).flatten().map(function(list) { return list.name }).value();
    var listItems = _.chain(snapshot.groups).map(function(group) { return group.lists }).flatten().map(function(list) { return list.items }).flatten().map(function(item) { return item.name }).value();
    var listStatItems = _.chain(snapshot.groups).map(function(group) { return group.lists }).flatten().map(function(list) { return list.stats }).flatten().compact().map(function(stat) { return stat.items }).flatten().map(function(item) { return item.name }).value();
    var maxNameLength = _.max(_.union(groups, counters, lists, listItems, listStatItems), function(name) { return name.length }).length;
    var maxColumns = _.chain(snapshot.groups).max(function(group) { return group.column }).value().column;
    var columnWidth = process.stdout.columns / maxColumns;

    console.log(snapshot.host + " @ " + new Date(snapshot.time));
    console.log();

    for (var i = 0; i <= maxColumns; i++) {
      var columnX = Math.floor((i - 1) * columnWidth);
      process.stdout.cursorTo(0, 2);

      _.where(snapshot.groups, {column: i}).forEach(function(group) {
        var indentation = maxNameLength - group.name.length + 2;
        process.stdout.cursorTo(columnX);
        console.log(repeat(" ", indentation) + group.name.cyan);

        group.counters.forEach(function(counter) {
          var indentation = maxNameLength - counter.name.length + 1;
          var color = thresholdToColor(counter.threshold);
          var value = color(numeral(counter.value).format(counter.format));

          process.stdout.cursorTo(columnX);
          console.log(repeat(" ", indentation) + counter.name + ": " + value);

          if (counter.stats) {
            counter.stats.forEach(function(stat) {
              var indentation = maxNameLength - stat.name.length + 1;

              process.stdout.cursorTo(columnX);
              console.log(repeat(" ", indentation) + (stat.name + ": ").gray + thresholdToColor(stat.threshold)(numeral(stat.value).format(counter.format)));
              console.log();
            });
          }
        });

        group.lists.forEach(function(list) {
          var indentation = maxNameLength - list.name.length + 2;

          process.stdout.cursorTo(columnX);
          console.log(repeat(" ", indentation) + list.name.cyan);

          list.items.forEach(function(item) {
            var indentation = maxNameLength - item.name.length + 1;
            var value = numeral(item.value).format(list.format);

            process.stdout.cursorTo(columnX);
            console.log(repeat(" ", indentation) + item.name + ": " + value);
          });

          console.log();

          if (list.stats) {
            list.stats.forEach(function(stat) {
              var indentation = maxNameLength - stat.name.length + 1;

              process.stdout.cursorTo(columnX);
              console.log(repeat(" ", indentation) + (stat.name + ": ").gray);

              stat.items.forEach(function(item) {
                var indentation = maxNameLength - item.name.length + 1;
                var value = numeral(item.value).format(list.format);

                process.stdout.cursorTo(columnX);
                console.log(repeat(" ", indentation) + item.name + ": " + value);
              });

              console.log();
            });
          }
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
