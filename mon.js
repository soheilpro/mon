#!/usr/bin/env node

var fs = require('fs');
var LocalDataSource = require('./datasource/local.js')
var RemoteDataSource = require('./datasource/remote.js')
var ConsoleRenderer = require('./renderer/console.js')
var ServerRenderer = require('./renderer/server.js')
var _ = require("underscore");
var eol = require('os').EOL;
var optimist = require('optimist')
    .usage('Usage:' + eol +
           '  mon <config file>' + eol +
           '  mon --server --port <port>' + eol +
           '  mon --client --address <address> --port <port>');

if (optimist.argv.server) {
  if (!optimist.argv.port) {
    console.error(optimist.help());
    return;
  }

  var dataSource = new LocalDataSource();
  var renderer = new ServerRenderer(dataSource, optimist.argv.port);
  renderer.start();
}
else if (optimist.argv.client) {
  if (!optimist.argv.address) {
    console.error(optimist.help());
    return;
  }

  if (!optimist.argv.port) {
    console.error(optimist.help());
    return;
  }

  var config = JSON.parse(fs.readFileSync(optimist.argv._[0]).toString());
  var dataSource = new RemoteDataSource(optimist.argv.address, optimist.argv.port);
  var renderer = new ConsoleRenderer(dataSource);
  renderer.start(config);
}
else {
  if (optimist.argv._.length == 0) {
    console.error(optimist.help());
    return;
  }

  var config = JSON.parse(fs.readFileSync(optimist.argv._[0]).toString());
  var dataSource = new LocalDataSource();
  var renderer = new ConsoleRenderer(dataSource);
  renderer.start(config);
}
