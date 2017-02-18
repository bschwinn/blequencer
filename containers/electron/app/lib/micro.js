const electron = require('electron');
const noble    = require('noble')
const sp       = require('serialport');
const settings = require('./settings');

const ipcMain = electron.ipcMain; // communication channel

// a serial micro controller facade that comms with arduino over serial/usb
microController = function(win, flavor) {
    this.setup(win, flavor);
};
microController.prototype = {
    setup: function(win, flavor) {
        // keep ref to main window to send events
        this.window = win;
        // create the underlying implementation: BLE, serial or simulator
        if (flavor == "ble") {
            console.log("microController - creating BLE driver implementation.")
            this.impl = new microControllerBLE(this);
        } else if ( flavor == "ser" ) {
            console.log("microController - creating serial driver implementation.")
            this.impl = new microControllerSerial(this);
        } else {
            console.log("microController - creating simulator implementation.")
            this.impl = new microControllerSim(this);
        }
        // now we listen for events from the UI/webapp (see preload.js)
        this.setupListeners();
    },
    setupListeners: function() {
        var me = this;
        // get the container's identification/properties.
        ipcMain.on('info', function(event) {
            me.window.webContents.send( "on-info", me.impl.getInfoData() );
        });
        // init the sequencer
        ipcMain.on('init', function(event, cfg) {
            me.impl.init(cfg);
        });
        // init the sequencer
        ipcMain.on('list', function(event) {
            me.impl.list();
        });
        // play the sequencer
        ipcMain.on('play', function(event) {
            me.impl.play();
        });
        // pause the sequencer
        ipcMain.on('pause', function(event) {
            me.impl.pause();
        });
        // stop the sequencer
        ipcMain.on('stop', function(event) {
            me.impl.stop();
        });
        // stop the sequencer
        ipcMain.on('reset', function(event) {
            me.impl.reset();
        });
        // manually advance the sequencer
        ipcMain.on('next', function(event) {
            me.impl.next();
        });
        // manually rewind the sequencer
        ipcMain.on('prev', function(event) {
            me.impl.prev();
        });
        // toggle noise
        ipcMain.on('noise', function(event, noiz) {
            me.impl.setNoise(noiz);
        });
        // set noise color
        ipcMain.on('nzcol', function(event, noiz) {
            me.impl.setNoiseColor(noiz);
        });
        // data available for the sequencer
        ipcMain.on('data', function(event, data) {
            me.impl.sendData(data);
        });
        ipcMain.on('rawdata', function(event, data) {
            me.impl.sendRawData(data);
        });
        // batch data available for the sequencer
        ipcMain.on('batch', function(event, data) {
            me.impl.sendBatch(data);
        });
    },
    shutdown: function() {
        this.impl.shutdown();
    },
    relayError: function(err) {
        this.window.webContents.send( "on-error", err );
    },
    relayData: function(parsed, raw) {
        this.window.webContents.send( "on-update", parsed );
        if ( raw != null && typeof raw != 'undefined' ) {
            this.window.webContents.send( "on-update", { "raw" : raw } );
        }
    }
}



// a serial micro controller facade that comms with arduino over serial/usb
microControllerSerial = function(par) {
    this.setup(par);
};
microControllerSerial.prototype = {
    setup: function(par) {
        this.parent = par;
        this.device = null;
    },
    init : function(config) {
        this.speed = config.speed;
        this.multiplier = config.multiplier;
        this.range = config.range;
        this.offset = config.offset;
        this.initialOffset = config.offset;
        this.offsetMult = 2;
        var me = this;
        var dev = settings.getDevice();
        if ( dev != null && dev != '' ) {
            // open the device
            this.device = new sp(dev, { baudRate: 115200, parser: sp.parsers.readline('\n') });

            // add a "data" listener
            this.device.on('data', function(data) {
                var parsed = me.serialToData(data);
                me.parent.relayData(parsed, data);
            });
            
            // add a "error" listener
            this.device.on('error', function(err) {
                console.log("microControllerSerial - got serial error: " + err.message);
                me.parent.relayError(err.message);
            });

        } else {
            this.parent.relayError("microControllerSerial - No serial device specified.");
            this.list();
        }
    },
    serialToData: function(data) {
        var cmd = data.substring(0, 5);
        var rest = data.substring(5);
        var args = rest.split(",");
        var dataObj = {}
        switch(cmd) {
            case "bpm  " :
                dataObj.bpm = parseInt(rest)/10;  // divide by 10 so the protocol only deals with integers
                break;
            case "step " :
                dataObj.step = parseInt(args[0]);
                break;
        }
        return dataObj;
    },
    shutdown: function() {
        if ( this.device != null ) {
            this.device.close(function(err) {
                if ( err != null ) {
                    console.log("microControllerSerial - got shutdown error: " + err.message);
                }
            });
        }
    },
    getInfoData : function() {
        return { name: "BLEquencer - Serial Driver", version: "6.6.6", "features": "BLE" };
    },
    list : function() {
        var me = this;
        var theList = [];
        sp.list(function(err, ports) {
            ports.forEach(function(port) {
                var msg = port.comName;
                msg += ' (' + port.manufacturer + ')';
                if ( typeof port.manufacturer != 'undefined' && port.manufacturer.indexOf('arduino') > -1 ) {
                    msg += " **";
                }
                theList[theList.length] = msg;
            });
            me.parent.relayData( { "list" : theList}, null);
        });
    },
    play : function() {
        this.sendRawData("play \n");
    },
    stop : function() {
        this.sendRawData("stop \n");
    },
    pause : function() {
        this.sendRawData("pause\n");
    },
    reset : function() {
        this.sendRawData("reset\n");
    },
    next : function() {
        this.sendRawData("next \n");
    },
    prev : function() {
        this.sendRawData("prev \n");
    },
    setNoise : function(noise) {
        this.sendRawData("noise" + (noise? "1" : "0") + "\n");
    },
    setNoiseColor : function(col) {
        this.sendRawData("nzcol" + col + "\n");
    },
    sendRawData : function(data) {
        this.sendToDevice(data);
    },
    sendBatch : function(data) {
        var theData = "";
        for ( var i=0; i<data.length; i++ ) {
            theData += this.parseData(data[i]);
        }
        this.sendToDevice(theData);
    },
    sendData : function(data) {
        var parsed = this.parseData(data);
        this.sendToDevice(parsed);
    },
    parseData: function(data) {
        var parsed = "";
        // parse speed params into a serial message
        if ( (data.speed != null) || (data.multiplier != null) ) {
            var bpm = this.updateInternals(data.speed, data.multiplier);
            parsed = "bpm  " + parseInt( bpm.toFixed(1) * 10) + "\n"; // multiply by 10 so the protocol only deals with integers
        } else if ( data.mode != null ) {
            parsed = "mode " + ((data.mode=="arp") ? 1 : 0) + "\n";
        } else if ( data.output != null && data.step != null ) {
            parsed = "note " + data.output + "," + data.step + "," + data.val + "," + ((data.enabled) ? "1" : "0") + "\n";
        } else if ( data.gate != null ) {
            parsed = "gate " + data.gate + "\n";
        } else if ( data.shmode != null ) {
            parsed = "shmo " + ((data.shmode=="follow") ? 1 : 0) + "\n";
        }
        return parsed;
    },
    updateInternals: function(speed, mult) {
        if ( speed != null ) {
            this.speed = speed;
        }
        if ( mult != null ) {
            this.updateMultiplier(mult);
        }
        bpm = this.calculateBPM(this.speed);
        return bpm;
    },
    updateMultiplier: function(mult) {
        this.multiplier = mult;
        if ( this.multiplier < 1 ) {
            this.offset = this.initialOffset / this.offsetMult;
        } else if ( this.multiplier > 1 ) {
            this.offset = this.initialOffset * this.offsetMult;
        } else {
            this.offset = this.initialOffset;
        }
    },
    calculateBPM: function(speed) {
        // range is 50-200BPM
        var pct = speed / 4095;
        var bpm = (pct * this.multiplier * this.range) + this.offset;
        return bpm;
    },
    sendToDevice : function(data) {
        if ( this.device != null ) {
            this.device.write(data, function(err) {
                if ( err != null ) {
                    console.log("microControllerSerial - error writing data to serial port: " + err.message)
                }
            });
        }
    }
}



// a serial micro controller facade that comms with arduino over BLE (using adafruit BLE module)
microControllerBLE = function(par) {
    this.setup(par);
};
microControllerBLE.prototype = {
    setup: function(par) {
        this.parent = par;
    },
    init : function(config) {
        console.log('microControllerBLE - initializing...');

        noble.on('stateChange', function(state) {
          if (state === 'poweredOn') {
            console.log('microControllerBLE state change - starting scan');
            noble.startScanning([], true);
          } else {
            console.log('microControllerBLE state change - stopping scan');
            noble.stopScanning();
          }
        });

        noble.on('discover', function(peripheral) {
            console.log('microControllerBLE - device discovered: ' + peripheral.id + ', local name: ' + peripheral.advertisement.localName + ', uuid\'s: ' +  + peripheral.advertisement.serviceUuids);
        });
    },
    getInfoData : function() {
        return { name: "BLEquencer - BLE Driver", version: "6.6.6", "features": "BLE" };
    },
    sendData : function(data) {
    },
    sendRawData : function(data) {
    }
}


// a fake micro controller for testing, simulates hardware feedback
microControllerSim = function(par) {
    this.setup(par);
};
microControllerSim.prototype = {
    setup: function(par) {
        this.parent = par;
    },
    init : function(config) {
        this.timer = null;
        this.step = 0;
        this.maxSteps = config.maxSteps;
        this.resets = config.resets;
        this.speed = config.speed;
        this.multiplier = config.multiplier;
        this.range = config.range;
        this.offset = config.offset;
        this.initialOffset = config.offset;
        this.offsetMult = 2;
    },
    getInfoData : function() {
        return { name: "BLEquencer - Hardware Simulator", version: "6.6.6", "features": "BLE" };
    },
    shutdown: function() {
        console.log("microControllerSim - shutting down.")
    },
    play: function() {
        that = this;
        if ( this.timer == null) {
            var bpm = this.calculateBPM(this.speed);
            this.timer = this.setVariableInterval(function(){
                that.next();
            }, this.calculateInterval(bpm));
            this.parent.window.webContents.send( "on-update", { bpm: bpm } );
        } else {
            this.timer.start();
        }
    },
    pause: function() {
        if ( this.timer != null) {
            this.timer.stop();
        }
    },
    stop: function() {
        if ( this.timer != null) {
            this.timer.stop();
        }
        this.step = 0;
        this.parent.window.webContents.send( "on-update", { step: 0 } );
    },
    reset : function() {
        this.stop();
        this.play();
    },
    next: function() {
        if ( (this.resets[this.step] == true) || (this.step >= this.maxSteps) ) {
            this.step = 0;
        } else {
            this.step++;
        }
        var that = this;
        this.parent.window.webContents.send( "on-update", { step: that.step } );
    },
    prev: function() {
        if ( this.step == 0 ) {
            this.step = this.getFirstReset();
        } else {
            this.step--;
        }
        var that = this;
        this.parent.window.webContents.send( "on-update", { step: that.step } );
    },
    getFirstReset: function() {
        var resets = this.resets;
        for (var i=0; i<resets.length; i++ ) {
            if ( resets[i] == true ) {
                return i;
            }
        }
    },
    sendBatch: function(data) {
        for ( var i=0; i<data.length; i++ ) {
            this.sendData(data[i]);
        }
    },
    sendData: function(data) {
        if ( (data.speed != null) || (data.multiplier != null) ) {
            var bpm = this.updateInternals(data.speed, data.multiplier);
            this.parent.window.webContents.send( "on-update", { bpm: bpm  } );
        }
        if ( data.resets ) {
            this.resets = data.resets;
            console.log( "microControllerSim - reset array change - value: " + data.resets);
        }
    },
    sendRawData : function(data) {
        console.log( "microControllerSim - raw data: " + data);
    },
    updateInternals: function(speed, mult) {
        if ( speed != null ) {
            this.speed = speed;
        }
        if ( mult != null ) {
            this.updateMultiplier(mult);
        }
        bpm = this.calculateBPM(this.speed);
        if ( this.timer != null ) {
            this.timer.interval = this.calculateInterval(bpm);
        }
        return bpm;
    },
    updateMultiplier: function(mult) {
        this.multiplier = mult;
        if ( this.multiplier < 1 ) {
            this.offset = this.initialOffset / this.offsetMult;
        } else if ( this.multiplier > 1 ) {
            this.offset = this.initialOffset * this.offsetMult;
        } else {
            this.offset = this.initialOffset;
        }
    },
    calculateBPM: function(speed) {
        // range is 50-200BPM
        var pct = speed / 4095;
        var bpm = (pct * this.multiplier * this.range) + this.offset;
        return bpm;
    },
    calculateInterval: function(bpm) {
        return ((1 / (bpm / 60)) * 1000).toFixed(1);
    },
    setVariableInterval: function(callbackFunc, timing) {
        var variableInterval = {
            interval: timing,
            callback: callbackFunc,
            stopped: false,
            runLoop: function() {
                if (variableInterval.stopped) return;
                var result = variableInterval.callback.call(variableInterval);
                if (typeof result == 'number') {
                    if (result === 0) return;
                    variableInterval.interval = result;
                }
                variableInterval.loop();
            },
            stop: function() {
                this.stopped = true;
                clearTimeout(this.timeout);
            },
            start: function() {
                this.stopped = false;
                return this.loop();
            },
            loop: function() {
                this.timeout = setTimeout(this.runLoop, this.interval);
                return this;
            }
        };
        return variableInterval.start();
    }

}

// the public settings API
module.exports = {
  microController: microController
};
