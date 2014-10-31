var fs = require("fs");
var util = require("util");
var events = require("events");
var Perfmon = require("../perfmon.js");
var iis = require("../iis.js");
var _ = require("underscore");

function LocalDataSource() {
}

util.inherits(LocalDataSource, events.EventEmitter);

LocalDataSource.prototype.start = function(config) {
  var _this = this;

  iis.getWorkerProcesses(function(error, processes) {
    _this.iisWorkerProcesses = !error ? processes : [];

    var counters = _.chain(config.groups)
                    .map(function(group) { return [group.counters, group.lists] })
                    .flatten()
                    .compact()
                    .map(function(item) { return item.id })
                    .unique()
                    .value();

    var perfmon = new Perfmon(counters);
    perfmon.start();

    perfmon.on("data", function(data) {
      var snapshot = {
        host: data.host,
        time: data.time,
        groups: _.map(config.groups, function(group) {
          return {
            name: group.name,
            column: group.column || 1,
            counters: _.map(group.counters, function(counter) {
              var match = _.find(data.counters, function(item) { return item.name === counter.id });
              var value = match ? match.value : NaN;

              if (counter.stats) {
                if (!counter.history)
                  counter.history = [];

                counter.history.push(value);
                counter.history = _.last(counter.history, _.max(_.map(counter.stats, function(stat) { return stat.count })));

                var stats = _.map(counter.stats, function(stat) {
                  var value = _this.calc(_.last(counter.history, stat.count), stat.func);

                  return {
                    name: stat.func + "(" + stat.count + ")",
                    value: value,
                    threshold: getThresholdByValue(value, counter.threshold)
                  };
                });
              }

              return {
                name: counter.name,
                value: value,
                format: counter.format,
                threshold: getThresholdByValue(value, counter.threshold),
                stats: stats,
              };
            }),
            lists: _.map(group.lists, function(list) {
              var regex = new RegExp(list.id.replace(/./g, function(c) { return (c === "*") ? "(.*?)" : "\\x" + c.charCodeAt(0).toString(16) }));

              var items = [];
              data.counters.forEach(function(counter) {
                var counterMatch = regex.exec(counter.name);

                if (!counterMatch)
                  return;

                var name = counterMatch[1];

                if (_.contains(list.exclude, name))
                  return;

                var iisWorkerProcessMatch = /w3wp_(\d+)/.exec(name);

                if (iisWorkerProcessMatch) {
                  var iisWorkerProcessId = parseInt(iisWorkerProcessMatch[1], 10);
                  var iisWorkerProcess = _.find(_this.iisWorkerProcesses, function(workerProcess) { return workerProcess.processId === iisWorkerProcessId });

                  if (iisWorkerProcess)
                    name += "/" + iisWorkerProcess.appPool;
                }

                items.push({
                  name: name,
                  value: counter.value,
                  threshold: getThresholdByValue(counter.value, list.threshold),
                });
              });

              items = _.sortBy(items, function(item) { return (list.sort === "desc" ? -1 : 1) * item.value });

              if (list.stats) {
                if (!list.history)
                  list.history = [];

                list.history.push(items);
                list.history = _.last(list.history, _.max(_.map(list.stats, function(stat) { return stat.count })));

                var stats = _.map(list.stats, function(stat) {
                  var items = _.zip.apply(null, list.history, stat.count);

                  items.forEach(function(group, index) {
                    var value = _this.calc(_.map(group, function(item) { return item.value }), stat.func);

                    items[index] = {
                      name: group[0].name,
                      value: value,
                      threshold: getThresholdByValue(value, list.threshold),
                    };
                  });

                  items = _.sortBy(items, function(item) { return (list.sort === "desc" ? -1 : 1) * item.value });

                  return {
                    name: stat.func + "(" + stat.count + ")",
                    items: _.first(items, list.count),
                  };
                });
              }

              return {
                name: list.name,
                items: _.first(items, list.count),
                format: list.format,
                stats: stats,
              };
            }),
          };
        })
      };

      _this.emit("snapshot", snapshot);
    });

    _this.perfmon = perfmon;

    _this.emit("start");
  });
};

LocalDataSource.prototype.stop = function() {
  var _this = this;

  if (_this.perfmon)
    _this.perfmon.stop();

  _this.emit("stop");
};

LocalDataSource.prototype.calc = function(data, func) {
  if (func == "sum")
    return _.reduce(data, function(memo, item) { return memo + item }, 0);

  if (func == "avg")
    return _.reduce(data, function(memo, item) { return memo + item }, 0) / data.length;
};

module.exports = LocalDataSource;

function getThresholdByValue(value, thresholds) {
  if (!thresholds)
    return null;

  return _.chain(thresholds)
          .filter(function(item) { return item.level >= value })
          .sortBy(function(item) { item.name })
          .first()
          .value();
}
