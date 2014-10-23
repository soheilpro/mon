#!/usr/bin/env node

var LocalDataSource = require("./datasource/local.js")
var RemoteDataSource = require("./datasource/remote.js")
var ConsoleController = require("./controller/console.js")
var ServerController = require("./controller/server.js")
var eol = require("os").EOL;
var optimist = require("optimist")
    .usage("Usage:" + eol +
           "  mon <config file>" + eol +
           "  mon --server --port <port>" + eol +
           "  mon --client --address <address> --port <port> <config file>");

var DataSource;
var Controller;

if (optimist.argv.server) {
  DataSource = LocalDataSource;
  Controller = ServerController;
}
else if (optimist.argv.client) {
  DataSource = RemoteDataSource;
  Controller = ConsoleController;
}
else {
  DataSource = LocalDataSource;
  Controller = ConsoleController;
}

var dataSource = new DataSource(optimist.argv);
var controller = new Controller(dataSource, optimist.argv);
controller.run();
