#!/usr/bin/env node

var fs = require("fs");
var url = require("url");
var ConsoleController = require("./controller/console.js")
var ServerController = require("./controller/server.js")
var eol = require("os").EOL;
var optimist = require("optimist")
    .usage("Usage:" + eol +
           "  mon <config file>" + eol +
           "  mon --server <address>:<port> <config file>" + eol +
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

    if (!argv._[0]) {
      console.log(optimist.help());
      return;
    }

    var config = JSON.parse(fs.readFileSync(argv._[0]).toString());

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

    controller = new ConsoleController(server, config, variables);
}

if (!controller) {
  console.log(optimist.help());
  return;
}

controller.run();
