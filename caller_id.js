var Freebox = require('node-freeboxos');
var script = require('commander');
var request = require('request');
var doT = require('dot');
var fs = require('fs');
var airtunes = require('airtunes');
var spawn = require('child_process').spawn;
var winston = require('winston');

script.version('0.7.6');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.simple(),
  transports: [
    //
    // - Write to all logs with level `info` and below to `combined.log`
    // - Write all logs error (and below) to `error.log`.
    //
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

//
// If we're not in production then log to the `console` with the format:
// `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
//
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

// This must be set before the require
process.env.NODE_CONFIG_DIR= require('path').resolve(__dirname, 'config');
var config = require('config');

doT.templateSettings.varname = 'call';

var infos = require('path').resolve(__dirname, 'freebox.json');
var smsAPI = 'https://smsapi.free-mobile.fr/sendmsg?';

const DELAY = 1000;
const DEFAULT_TEMPLATE = "Appel Freebox : {{? call.number==''}}Anonyme{{??}}{{=call.number}} ({{=call.name}}){{?}}";
const VOICE_PATH = './voice.wav';
const VOICES_PATH = './voices.wav';
const FREEBOX_SERVER = 'mafreebox.freebox.fr';
const FREEBOX_VOLUME = 100;
const FFMPEG = '/usr/bin/ffmpeg';
const PICO2WAVE = '/usr/bin/pico2wave';
const SOX = '/usr/bin/sox';

var lastCallID = 0;

script.command('init').description("Requests authorization").action( ()=> {
  var freeboxConf=fillConfig();
  var freebox=new Freebox(freeboxConf);

  freebox.waitApplicationGranted(1000*60*2, (error, app) => {
    if (error) {
      console.error(JSON.stringify(error));
      process.exit(0);
    }

    freebox.saveJSON(infos, (error) => {
      if (error) {
        console.error(JSON.stringify(error));
        process.exit(0);
      }
      console.log('freebox.json saved with success');
      process.exit(0);
    });
  });
});

script.command('calls').description("Return calls").action( ()=> {
  getCalls(function(error, calls) {
    if (error && error.canRetry) console.error("Try again, this error should disappear");
    if (error) return console.error("error=",error);
    console.log(calls);
    process.exit(0);
  });
});

script.command('lastcall').description("Return last call").action( ()=> {
  getCalls(function(error, calls) {
    if (error && error.canRetry) console.error("Try again, this error should disappear");
    if (error) return console.error("error=",error);
    if (calls == null || calls.length == 0) return console.log("No call");
    console.log(calls[0]);
    process.exit(0);
  });
});

script.parse(process.argv);

// Main run, when no parameter passed
if (!script.args.length) run();

function run() {
  getCalls(function(error, calls) {
    if (error) {
      if (!error.canRetry) logger.error(error);
      return setTimeout(run, DELAY);
    }

    if (calls == null || calls.length == 0) return setTimeout(run, DELAY);

    // Get last call
    var call = calls[0];

    // Is the call currently ringing?
    if (call.type == 'missed' && call.duration == 0) {
      logger.info(JSON.stringify(call));

      // If we already notified for this call...
      if (lastCallID == call.id) {
        logger.info('Already sent');
        return setTimeout(run, DELAY);
      }

      // We don't want to send the same SMS every seconds...
      lastCallID = call.id;

      sendNotifications(call, function(error) {
        if (error) {
          logger.error(error); // Just log..
        }
        return setTimeout(run, DELAY);
      });
    } else {
      return setTimeout(run, DELAY);
    }
  });
}

function sendNotifications(call, callback) {
  logger.info('Sending notifications...');

  var remaining=0;

  if (config.has('voice2freebox')) {
    sendVoice2Freebox(call, config.get('voice2freebox'), done);
    remaining++;
  }
  if (config.has('freemobile')) {
    sendAllSMS(call, done);
    remaining++;
  }

  // No notifications at all configured
  if (remaining==0) return callback();

  function done(err) {
    remaining--;
    if (remaining == 0) {
      // We're done sending all notifications
      logger.info('All notifications sent');
      return callback();
    }
  }
}

function sendVoice2Freebox(call, conf, callback) {
  genSound(call.name, conf, function() {
    logger.info('Sending voice...');
    var ffmpegBin = conf.hasOwnProperty('ffmpeg') ? conf['ffmpeg'] : FFMPEG;
    sendSound(VOICES_PATH, ffmpegBin);
    return callback();
  });
}

function sendAllSMS(call, callback) {
  var remaining = 0;
  var errors = null;

  // Check if config OK
  if (config.has('freemobile')) {
    var mobile;
    remaining = config.get('freemobile').length;
    logger.info('Sending ' + remaining + ' SMS...');
    for (var i=0; i< config.get('freemobile').length; i++) {
      mobile = config.get('freemobile')[i];
      sendSMS(call, mobile, done);
    }
  } else {
    return callback();
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

    request({uri: smsAPI + 'user=' + mobile['login'] + '&pass=' + mobile['pass'] + '&msg=' + encodeURIComponent(templateFn(data))}, function(error, response, body) {
      if (error) {
        callback(error);
      }

      callback(null);
    });
  }

  function done(error) {
    if (error) {
      errors += error;
      logger.error('error: ' + error);
    } else {
      logger.info('SMS sent');
    }
    remaining--;
    if (remaining == 0) {
      // We're done sending all SMS
      logger.info('All SMS sent');
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
      return callback(error,null);
    }

    return callback(null, calls);
  });
}

function genSound(words, conf, callback) {
    var pico2waveBin = conf.hasOwnProperty('pico2wave') ? conf['pico2wave'] : PICO2WAVE;
    var soxBin = conf.hasOwnProperty('sox') ? conf['sox'] : SOX;
    var repeat = conf.hasOwnProperty('repeat') ? conf['repeat'] : 1;
    var before = conf.hasOwnProperty('before') ? conf['before'] : null;
    var middle = conf.hasOwnProperty('middle') ? conf['middle'] : null;
    var after = conf.hasOwnProperty('after') ? conf['after'] : null;

  pico2wave(words, 'fr-FR', VOICE_PATH, function() {
    sox(VOICE_PATH, VOICES_PATH, repeat || 1, before, middle, after, function() {
      callback();
    });
  });

  function pico2wave(text, lang, path, cb) {
    var pico2wave = spawn(pico2waveBin, [
      '-w', path,
      '-l', lang,
      text
    ]);

    pico2wave.on('close', (code) => {
      cb();
    });

    pico2wave.stderr.setEncoding('utf8');
    pico2wave.stderr.on('data', function(data) {
      logger.error(data);
    });
  }

  function sox(input, output, repeat, before, middle, after, cb) {
    var parameters = ['-v', '1.5'];

    if (before != null) parameters.push(before);

    for(var i=0; i < repeat; i++) {
      parameters.push(input);
      if (middle != null) parameters.push(middle);
    }

    if (after != null) parameters.push(after);

    parameters.push(output);

    var sox = spawn(soxBin, parameters);

    sox.on('close', (code) => {
      cb();
    });

    sox.stderr.setEncoding('utf8');
    sox.stderr.on('data', function(data) {
      logger.error(data);
    });
  }
}

function sendSound(path, ffmpegBin) {
  var device = airtunes.add(FREEBOX_SERVER, {volume:FREEBOX_VOLUME});

  // when the device is online, spawn ffmpeg to transcode the file
  device.on('status', function(status) {
    logger.info('status: ' + status);

    if(status !== 'ready')
    return;

  var ffmpeg = spawn(ffmpegBin, [
    '-i', path,
    '-f', 's16le',        // PCM 16bits, little-endian
    '-ar', '44100',       // Sampling rate
    '-ac', 2,             // Stereo
    'pipe:1'              // Output on stdout
    ]);

  // pipe data to AirTunes
  ffmpeg.stdout.pipe(airtunes);

  // detect if ffmpeg was not spawned correctly
  ffmpeg.stderr.setEncoding('utf8');
  ffmpeg.stderr.on('data', function(data) {
    if(/^execvp\(\)/.test(data)) {
      logger.error('failed to start ' + ffmpegBin);
      process.exit(1);
    }
  });
  });

  // monitor buffer events
  airtunes.on('buffer', function(status) {
    logger.info('buffer ' + status);

    // after the playback ends, give some time to AirTunes devices
    if(status === 'end') {
      logger.info('playback ended, waiting for AirTunes devices');
      setTimeout(function() {
        airtunes.stopAll(function() {
          logger.info('end');
          airtunes.reset();
        });
      }, 2000);
    }
  });
}

function fillConfig() {
  // Will be shown on the Freebox LCD screen
  var app = {
    app_id       : "callerid", 
    app_name     : "Caller ID",
    app_version  : "0.7.6",
    device_name  : "Server"
  };

  var freeboxConf = {'app': app};

  return freeboxConf;
}


