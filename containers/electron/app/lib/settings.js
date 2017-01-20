// default settings

// debugger?
const DEBUG = false;

// driver modes
const MODE_SIMULATOR = "sim";
const MODE_SERIAL    = "ser";
const MODE_BLE       = "ble";
const DEFAULT_MODE   = MODE_BLE

// app url
const MAIN_URL = "file://" + __dirname + "/../../../../webapp/index.html";

// window settings
const DEFAULT_WIN_STATE = { width: 1024, height: 768, maximized: false };
const DEFAULT_USER_AGENT = "Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.26 (KHTML, like Gecko) Chrome/26.0.1384.0 Safari/537.26 StandaloneMessenger/1.0.0";
const DEFAULT_IDLE_TIMEOUT = 1 * 60 * 1000;

// command line param vars
var cmdLineUrl = null;
var cmdLineDebug = null;
var cmdLineUserAgent = null;
var cmdLineMode = null;
var cmdLineDevice = null;

// process the command line args
// we expect args of the kvp form: p1=asdf p2="asdf jkl;"
process.argv.slice(2).forEach(function(val,index, array) {
  console.log(index + ': ' + val);
  if (val.indexOf('=') > 0) {
  	var pair = val.split('=');
  	if ( pair.length ==2 ) {
  		switch(pair[0]) {
        case "url" :
          cmdLineUrl = pair[1];
          break;
        case "useragent" :
          cmdLineUserAgent = pair[1];
          break;
        case "debug":
          cmdLineDebug = (pair[1]==="true");
          break;
        case "mode":
          cmdLineMode = pair[1];
          break;
        case "device":
          cmdLineDevice = pair[1];
          break;
  		}
  	}
  }
});

// return the url of the main application
getUrl = function() {
	if (cmdLineUrl !== null) {
		return cmdLineUrl; 
	} else {
		return MAIN_URL; 
	}
}

// default window state, useful for the first time starting the app
getDefaultWindowState = function() {
  return DEFAULT_WIN_STATE;
}

// are we debugging?  Typically used to show the debugger console
isDebugging = function() {
  if (cmdLineDebug !== null) {
    return cmdLineDebug; 
  } else {
    return DEBUG; 
  }
}

// the user agent header value
getUserAgent = function() {
  if (cmdLineUserAgent !== null) {
    return cmdLineUserAgent; 
  } else {
    return DEFAULT_USER_AGENT; 
  }
}

// get the mode (hardware simulator, serial driver or ble driver)
getMode = function() {
  if (cmdLineMode !== null) {
    return cmdLineMode; 
  } else {
    return DEFAULT_MODE;
  }
}

getDevice = function() {
  return cmdLineDevice;
}

// the public settings API
module.exports = {
  getUrl: getUrl,
  getDefaultWindowState: getDefaultWindowState,
  isDebugging: isDebugging,
  getUserAgent: getUserAgent,
  getMode: getMode,
  getDevice: getDevice
};
