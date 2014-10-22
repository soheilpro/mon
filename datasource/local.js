var util = require("util");
var events = require("events");
var perfmon = require('perfmon');
var _ = require("underscore");

function LocalDataSource() {
}

util.inherits(LocalDataSource, events.EventEmitter);

LocalDataSource.prototype.start = function(config) {
  var _this = this;

  var counters = _.chain(config.groups)
                  .map(function(group) { return group.counters })
                  .flatten()
                  .map(function(counter) { return counter.id })
                  .unique()
                  .value();

  perfmon(counters, function(error, data) {
    if (error) {
      _this.emit("error", error);
      return;
    }

    var snapshot = {
      groups: _.map(config.groups, function(group) {
        return {
          name: group.name,
          counters: _.map(group.counters, function(counter) {
            var value = data.counters[counter.id];

            return {
              name: counter.name,
              value: value,
              format: counter.format || '0,0',
              threshold: getThresholdByValue(value, counter.threshold)
            };
          }),
        };
      })
    };

    _this.emit("snapshot", snapshot);
  });
};

module.exports = LocalDataSource;

function getThresholdByValue(value, thresholds) {
  if (!thresholds)
    return null;

  return _.chain(thresholds)
          .map(function(v, k) { return {'level': k, 'name': v} })
          .filter(function(item) { return item.level >= value })
          .sortBy(function(item) { item.name })
          .first()
          .value();
}
