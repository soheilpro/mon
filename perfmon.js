var util = require("util");
var events = require("events");
var spawn = require("child_process").spawn;
var boundary = require("./boundary.js");
var parse = require("csv-parse");
var _ = require("underscore");

function Perfmon(counters) {
  var _this = this;

  _this.counters = counters;
}

util.inherits(Perfmon, events.EventEmitter);

Perfmon.prototype.start = function() {
  var _this = this;

  var typeperf = spawn("typeperf", _this.counters);
  var counters;
  var missingCounterIndexes;

  typeperf.stdout = boundary.delimited(typeperf.stdout);

  typeperf.stdout.on("message", function(message) {
    message = message.toString();

    if (!message)
      return;

    if (message.indexOf("\"") == -1)
      return;

    parse(message, function(error, csv) {
      var row = csv[0];

      if (row[0] == "(PDH-CSV 4.0)") {
        counters = _.rest(row, 1);
        return;
      }

      var host = counters.length > 0 ? /\\\\(\w+)\\/.exec(counters[0])[1] : "";
      var time = new Date(row[0]);
      var values = _.rest(row, 1);

      if (!missingCounterIndexes) {
        missingCounterIndexes = [];

        values.forEach(function (value, index) {
          if (value === "-1")
            missingCounterIndexes.push(index);
        });
      }

      for (var i = missingCounterIndexes.length - 1; i >= 0; i--)
        values.splice(missingCounterIndexes[i], 1);

      var result = {
        host: host,
        time: time,
        counters: _.toArray(_.map(_.zip(counters, values), function(item) {
          return {
            name: item[0].replace("\\\\" + host, ""),
            value: parseFloat(item[1])
          };
        }))
      }

      _this.emit("data", result);
    });
  });

  _this.typeperf = typeperf;
};

Perfmon.prototype.stop = function() {
  var _this = this;

  if (_this.typeperf)
    _this.typeperf.kill();
};

module.exports = Perfmon;