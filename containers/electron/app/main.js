'use strict';

const electron  = require('electron');
const storage   = require("./lib/storage");
const settings  = require("./lib/settings");
const micro     = require("./lib/micro")

const app       = electron.app;     // Module to control application life.

const isMac = (process.platform == 'darwin');

var mc = null;
var mainWindow = null;  // keep a global ref to avoid being GC'ed

// Quit when all windows are closed
app.on('window-all-closed', function() {
  app.quit();
});

// app initialization
app.on('ready', function() {

  // Create the main browser window, restoring saved proportions, call maximize if needed.
  var lastWindowState = storage.get("lastWindowState", settings.getDefaultWindowState());
  mainWindow = new electron.BrowserWindow({
      x: lastWindowState.x,
      y: lastWindowState.y,
      width: lastWindowState.width, 
      height: lastWindowState.height,
      webPreferences: {
        nodeIntegration: false,
        preload: __dirname + '/preload.js'
      }
  });
  if (lastWindowState.maximized) {
    mainWindow.maximize();
  }

  // load the actual web app
  mainWindow.loadURL(settings.getUrl(), {userAgent: settings.getUserAgent()});

  // open the dev tools if we're debugging
  if ( settings.isDebugging() ) {
    mainWindow.webContents.openDevTools({"detach" : true});
  }

  // create the micro controller driver
  mc = new micro.microController(mainWindow, settings.getMode());

  // once the JS env is done loadig, register with the web app
  mainWindow.webContents.on('did-finish-load', function() {
    mainWindow.webContents.send('register-container', null);
  });

  // close event handler - save state to storage and shutdown driver
  mainWindow.on('close', function () {
    var bounds = mainWindow.getBounds(); 
    storage.set("lastWindowState", {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      maximized: mainWindow.isMaximized()
    });
    // shutdown the micro controller
    mc.shutdown();
  });

  // closed event handler - deref the main window.
  mainWindow.on('closed', function() {
    mainWindow = null;
  });

});
