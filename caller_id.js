var Freebox = require('node-freeboxos');
var script = require('commander');
var fs = require('fs');
var path = require('path');
var request = require('request');

script.version('0.0.1');

var infos = '/tmp/callerid/freebox.json';
var logDir = '/tmp/callerid/';
var smsAPI = 'https://smsapi.free-mobile.fr/sendmsg?';
var user = require('./config.json');

const DELAY = 1000;

script.command('init').description("Requests authorization").action( ()=> {
  var config=fillConfig();
  var freebox=new Freebox(config);

  freebox.waitApplicationGranted(1000*60*2, (error, app) => {
    console.error("error=",error,"app=",app);

    if (error) {
      console.error(error);
      return;
    }

    ensureDirectoryExistence(infos);

    freebox.saveJSON(infos, (error) => {
      if (error) {
        console.error(error);
        return;
      }
    });
  });
});

script.command('calls').description("Return calls").action( ()=> {
  getCalls(function(error, calls) {
    console.log("calls=",calls);
  });
});

script.command('lastcall').description("Return last call").action( ()=> {
  getCalls(function(error, calls) {
    console.log("lastcall=",calls[0]);
  });
});

script.parse(process.argv);

// Main run, when no parameter passed
if (!script.args.length) run();

function run() {
  getCalls(function(error, calls) {
    if (error) return setTimeout(run, DELAY);

    if (calls.length == 0) return setTimeout(run, DELAY);

    // Get last call
    var call = calls[0];

    // Is the call currently ringing?
    if (call.type == 'missed' && call.duration == 0) {
      console.log("calls=",call);

      // Check if we already notified
      if (checkNotified(call)) {
        return setTimeout(run, DELAY);
      }

      // We don't want to send the same SMS every seconds...
      storeNotified(call);

      request({uri: smsAPI + 'user=' + user.login + '&pass=' + user.pass + '&msg=' + call.number}, function(error, response, body) {
        if (error) {
          console.log(error);
        }

        return setTimeout(run, DELAY);
      });
    } else {
      return setTimeout(run, DELAY);
    }
  });
}

function getCalls(callback) {
  var config=fillConfig();

  config.jsonPath = infos;
  config.jsonAutoSave = true;

  var freebox = new Freebox(config);

  freebox.calls((error, calls) => {
    if (error) {
      console.error(error);
      return callback(error,null);
    }

    return callback(null, calls);
  });
}

function checkNotified(call, callback) {
  var callLog = logDir+call.id;
  return fs.existsSync(callLog);
}

function storeNotified(call) {
  var callLog = logDir+call.id;
  ensureDirectoryExistence(callLog);
  fs.writeFileSync(callLog, JSON.stringify(call, null, '\t'));
}

function ensureDirectoryExistence(filePath) {
  var dirname = path.dirname(filePath);
  if (fs.existsSync(dirname)) {
    return true;
  }
  ensureDirectoryExistence(dirname);
  fs.mkdirSync(dirname);
}

function fillConfig() {
  // Will be shown on the Freebox LCD screen
  var app = {
    app_id       : "callerid", 
    app_name     : "Caller ID",
    app_version  : "0.0.1",
    device_name  : "Server"
  };

  var config = {app};

  return config;
}

