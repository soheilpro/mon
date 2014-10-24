var spawn = require("child_process").spawn;
var eol = require("os").EOL;

function iis() {
}

iis.getWorkerProcesses = function(callback) {
  var _this = this;

  var appcmd = spawn("appcmd", ["list", "wps"], { cwd: process.env.windir + "\\system32\\inetsrv" });
  var data = "";
  var processes = [];

  appcmd.stdout.on("data", function(chunk) {
    data += chunk.toString();

    while (true) {
      var eolIndex = data.indexOf(eol);
      if (eolIndex == -1)
        break;

      var line = data.substring(0, eolIndex);
      data = data.substr(eolIndex + eol.length);

      if (!line)
        break;

      if (line.indexOf("ERROR") != -1) {
        callback(line);
        return;
      }

      var match = /WP "(\d+)" \(applicationPool:(.+?)\)/.exec(line);

      processes.push({
        processId: parseInt(match[1], 10),
        appPool: match[2]
      });
    }
  });

  appcmd.on("close", function() {
    callback(null, processes);
  });
};

module.exports = iis;