var Freebox = require('node-freeboxos');
var script = require('commander');
var config = require('config');
var request = require('request');
var doT = require('dot');

script.version('0.5.1');

doT.templateSettings.varname = 'call';

var infos = './freebox.json';
var smsAPI = 'https://smsapi.free-mobile.fr/sendmsg?';

const DELAY = 1000;
const DEFAULT_TEMPLATE = "Appel Freebox : {{? call.number==''}}Anonyme{{??}}{{=call.number}} ({{=call.name}}){{?}}";

var lastCallID = 0;

script.command('init').description("Requests authorization").action( ()=> {
  var freeboxConf=fillConfig();
  var freebox=new Freebox(freeboxConf);

  freebox.waitApplicationGranted(1000*60*2, (error, app) => {
    console.error("error=",error,"app=",app);

    if (error) {
      console.error(error);
      return;
    }

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
    if (error) return console.error("error=",error);
    console.log(calls);
  });
});

script.command('lastcall').description("Return last call").action( ()=> {
  getCalls(function(error, calls) {
    if (calls.length == 0) return console.log("No call");
    console.log(calls[0]);
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
      console.log(call);

      // If we already notified for this call...
      if (lastCallID == call.id) {
        console.log('Already sent');
        return setTimeout(run, DELAY);
      }

      // We don't want to send the same SMS every seconds...
      lastCallID = call.id;

      sendNotifications(call, function(error) {
        if (error) {
          console.log(error); // Just log..
        }
        return setTimeout(run, DELAY);
      });
    } else {
      return setTimeout(run, DELAY);
    }
  });
}

function sendNotifications(call, callback) {
  console.log('Sending notifications...');
  return sendAllSMS(call, callback);
}

function sendAllSMS(call, callback) {
  var remaining = 0;
  var errors = null;

  // Check if config OK
  if (config.has('freemobile')) {
    var mobile;
    remaining = config.get('freemobile').length;
    console.log('Sending ' + remaining + ' SMS...');
    for (var i=0; i< config.get('freemobile').length; i++) {
      mobile = config.get('freemobile')[i];
      sendSMS(call, mobile, done);
    }
  }

  function sendSMS(call, mobile, callback) {
    var template = '';

    if (mobile.hasOwnProperty('template')) {
      template = mobile['template'];
    } else {
      template = DEFAULT_TEMPLATE;
    }

    var templateFn = doT.template(template);

    if (!(mobile.hasOwnProperty('login') && mobile.hasOwnProperty('pass') )) return setTimeout(run, DELAY);

    var data = {
      number: call.number,
      type: call.type,
      id: call.id,
      duration: call.duration,
      datetime: call.datetime,
      contact_id: call.contact_id,
      line_id: call.line_id,
      name: call.name,
      new: call.new
    };

    request({uri: smsAPI + 'user=' + mobile['login'] + '&pass=' + mobile['pass'] + '&msg=' + templateFn(data)}, function(error, response, body) {
      if (error) {
        callback(error);
      }

      callback(null);
    });
  }

  function done(error) {
    if (error) {
      errors += error;
      console.log('error: ' + error);
    } else {
      console.log('SMS sent');
    }
    remaining--;
    if (remaining == 0) {
      // We're done sending all SMS
      console.log('All SMS sent');
      return callback(errors);
    }
  }
}

function getCalls(callback) {
  var freeboxConf=fillConfig();

  freeboxConf.jsonPath = infos;
  freeboxConf.jsonAutoSave = true;

  var freebox = new Freebox(freeboxConf);

  freebox.calls((error, calls) => {
    if (error) {
      console.error(error);
      return callback(error,null);
    }

    return callback(null, calls);
  });
}

function fillConfig() {
  // Will be shown on the Freebox LCD screen
  var app = {
    app_id       : "callerid", 
    app_name     : "Caller ID",
    app_version  : "0.5.1",
    device_name  : "Server"
  };

  var freeboxConf = {app};

  return freeboxConf;
}

