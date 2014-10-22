var colors = require('colors');
var numeral = require('numeral');
var _ = require("underscore");

function ConsoleRenderer(dataSource) {
  this.dataSource = dataSource;
}

ConsoleRenderer.prototype.start = function(config) {
  cls();

  this.dataSource.on("error", function(error) {
    console.error(error);
  });

  this.dataSource.on("snapshot", function(snapshot) {
    cls();

    var groups = _.chain(snapshot.groups).map(function(group) { return group.name }).value();
    var counters = _.chain(snapshot.groups).map(function(group) { return group.counters }).flatten().map(function(counter) { return counter.name }).value();
    var maxNameLength = _.max(_.union(groups, counters), function(item) { return item.length }).length;

    snapshot.groups.forEach(function(group) {
      var indentation = repeat(' ', maxNameLength - group.name.length + 2);
      console.log(indentation + group.name.cyan);

      group.counters.forEach(function(counter) {
        var indentation = repeat(' ', maxNameLength - counter.name.length + 1);
        var color = thresholdToColor(counter.threshold);

        console.log(indentation + counter.name + ': ' + color(numeral(counter.value).format(counter.format)));
      });

      console.log();
    });
  });

  this.dataSource.start(config);
};

module.exports = ConsoleRenderer;

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
  process.stdout.write('\u001B[2J\u001B[0;0f');
}

function repeat(str, num) {
  return new Array(num + 1).join(str);
}
