#!/usr/bin/env node

var fs = require("fs");
var url = require("url");
var path = require("path");
var ConsoleController = require("./controller/console.js")
var ServerController = require("./controller/server.js")
var Config = require("./config.js");
var eol = require("os").EOL;
var optimist = require("optimist")
    .usage("Usage:" + eol +
           "  mon [<configfile>]" + eol +
           "  mon --server <address>:<port> [<configfile>]" + eol +
           "  mon serve [--port <port>]");
var _ = require("underscore");

var controller;
var argv = optimist.argv;

switch (argv._[0])
{
  case "serve":
    if (argv.port && !_.isNumber(argv.port)) {
      console.log(optimist.help());
      return;
    }

    var port = argv.port || 8080;

    controller = new ServerController(port);
    break;

  default:
    if (argv.server) {
      if (!_.isString(argv.server)) {
        console.log(optimist.help());
        return;
      }

      if (!/^http:\/\//i.exec(argv.server))
        argv.server = "http://" + argv.server;

      var server = url.parse(argv.server);
    }

    if (argv.var) {
      if (!_.isArray(argv.var))
        argv.var = [argv.var];

      var variables = _.compact(_.map(argv.var, function(variable) {
        var match = /^(.*?)=(.*?)$/.exec(variable);

        if (!match)
          return null;

        return {
          name: match[1],
          value: match[2]
        };
      }));
    }

    var configFile = argv._[0] || path.resolve(__dirname, "./config/default.json");
    var config = Config.parse(fs.readFileSync(configFile).toString()).instantiate(variables);

    controller = new ConsoleController(server, config);
}

if (!controller) {
  console.log(optimist.help());
  return;
}

controller.run();
