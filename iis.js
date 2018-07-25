var spawn = require("child_process").spawn;
var boundary = require("./boundary.js");

function iis() {
}

iis.getWorkerProcesses = function(callback) {
  var _this = this;

  var appcmd = spawn("appcmd", ["list", "wps"], { cwd: process.env.windir + "\\system32\\inetsrv" });
  var processes = [];

  appcmd.stdout = boundary.delimited(appcmd.stdout);

  appcmd.stdout.on("message", function(message) {
    message = message.toString();

    if (!message)
      return;

    if (message.indexOf("ERROR") != -1) {
      callback(message);
      return;
    }

    var match = /WP "(\d+)" \(applicationPool:(.+?)\)/.exec(message);

    processes.push({
      processId: parseInt(match[1], 10),
      appPool: match[2]
    });
  });

  appcmd.on("error", function() {
    callback(null, [processes]);
  });

  appcmd.on("close", function() {
    callback(null, processes);
  });
};

module.exports = iis;