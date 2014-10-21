#!/usr/bin/env node

var fs = require('fs');
var core = require('./core.js')
var numeral = require('numeral');
var colors = require('colors');
var _ = require("underscore");
var eol = require('os').EOL;
var optimist = require('optimist')
    .usage('Usage:' + eol + '  mon <config file>');

if (optimist.argv._.length == 0) {
  console.log(optimist.help());
  return;
}

var config = JSON.parse(fs.readFileSync(optimist.argv._[0]).toString());

cls();

core.start(config, function(error, snapshot) {
  if (error) {
    console.error(error);
    return;
  }

  cls();
  displaySnapshot(snapshot);
})

function displaySnapshot(snapshot) {
  var groups = _.chain(config.groups).map(function(group) { return group.name }).value();
  var counters = _.chain(config.groups).map(function(group) { return group.counters }).flatten().map(function(counter) { return counter.name }).value();
  var maxNameLength = _.max(_.union(groups, counters), function(item) { return item.length }).length;

  snapshot.groups.forEach(function(group) {
    var indentation = ' '.repeat(maxNameLength - group.name.length + 2);
    console.log(indentation + group.name.cyan);

    group.counters.forEach(function(counter) {
      var indentation = ' '.repeat(maxNameLength - counter.name.length + 1);
      var color = thresholdToColor(counter.threshold);

      console.log(indentation + counter.name + ': ' + color(numeral(counter.value).format(counter.format)));
    });

    console.log();
  });
}

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

String.prototype.repeat = function(num) {
  return new Array(num + 1).join(this);
}
