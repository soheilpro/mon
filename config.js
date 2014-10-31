var _ = require("underscore");

function Config() {
}

Config.parse = function(text) {
  var config = JSON.parse(text);
  config.__proto__ = Config.prototype;
  config.normalize();

  return config;
};

Config.prototype.normalize = function() {
  var _this = this;

  if (!_this.variables)
    _this.variables = {};

  if (!_this.groups)
    _this.groups = [];

  _this.groups.forEach(function (group) {
    if (!group.counters)
      group.counters = [];

    group.counters.forEach(function (counter, index) {
      if (_.isString(counter)) {
        counter = {
          id: counter
        };

        group.counters[index] = counter;
      }

      if (!counter.name)
        counter.name = /\\([^\\]+)\\(.+)/.exec(counter.id)[2];

      if (!counter.format)
        counter.format = "0,0";

      if (counter.threshold && !_.isArray(counter.threshold))
        counter.threshold = _.map(counter.threshold, function(v, k) {
          return {
            level: (k === "*" ? Number.MAX_VALUE : k),
            name: v
          };
        });

      if (counter.stats) {
        counter.stats.forEach(function(stat, index) {
          var match = /(\w+)\((\d+)\)/.exec(stat);
          if (match)
            counter.stats[index] = {
              func: match[1],
              count: match[2]
            };
        });
      }
    });

    if (!group.lists)
      group.lists = [];

    group.lists.forEach(function (list, index) {
      if (_.isString(group.list)) {
        list = {
          id: group.list
        };

        group.lists[index] = list;
      }

      if (!list.count)
        list.count = 5;

      if (!list.sort)
        list.sort = "desc";

      if (!list.format)
        list.format = "0,0";

      if (list.threshold && !_.isArray(list.threshold))
        list.threshold = _.map(list.threshold, function(v, k) {
          return {
            level: (k === "*" ? Number.MAX_VALUE : k),
            name: v
          };
        });

      if (list.stats) {
        list.stats.forEach(function(stat, index) {
          var match = /(\w+)\((\d+)\)/.exec(stat);
          if (match)
            list.stats[index] = {
              func: match[1],
              count: match[2]
            };
        });
      }
    });
  });
}

Config.prototype.instantiate = function(variables) {
  var _this = this;

  var instance = Config.parse(_this.toString());

  if (variables)
    variables.forEach(function(variable) {
      instance.variables[variable.name] = variable.value;
    });

  instance.groups.forEach(function (group) {
    group.counters.forEach(function (counter, index) {
      counter.id = counter.id.replace(/%\w+%/gi, function(match) {
        return instance.variables ? instance.variables[match.replace(/%/g, "")] || "" : "";
      });
    });

    group.lists.forEach(function (list, index) {
      list.id = list.id.replace(/%\w+%/gi, function(match) {
        return instance.variables ? instance.variables[match.replace(/%/g, "")] || "" : "";
      });
    });
  });

  return instance;
};

Config.prototype.toString = function() {
  return JSON.stringify(this);
};

module.exports = Config;
