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
        // list devices
        ipcMain.on('list', function(event) {
            me.impl.list();
        });
        // dump device data
        ipcMain.on('dump', function(event) {
            me.impl.dump();
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
        if ( parsed != null ) {
            this.window.webContents.send( "on-update", parsed );
        } else if ( raw != null ) {
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
        this.baudRate = 9600;
        this.writing = false;
        this.throttleTime = 33;
        this.CMD_BPM   = "1";  // val (0-5000) 
        this.CMD_PLAY  = "2";  // no args
        this.CMD_PAUSE = "3";  // no args
        this.CMD_STOP  = "4";  // no args
        this.CMD_RESET = "5";  // no args
        this.CMD_NEXT  = "6";  // no args
        this.CMD_PREV  = "7";  // no args
        this.CMD_NOTE  = "8";  // step, bank, val (0-4095)
        this.CMD_NOISE = "9";  // bool
        this.CMD_NZCOL = ":";  // val (0-500) ??
        this.CMD_MODE  = ";";  // bool
        this.CMD_GATE  = "<";  // val (5-95)
        this.CMD_SHMOD = "=";  // bool
        this.CMD_DUMP  = ">";  // no args
        this.CMD_STRST = "?";
        this.CMD_STENB = "@";
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
            this.device = new sp(dev, { baudRate: this.baudRate, parser: sp.parsers.readline('\n') });

            // add a "data" listener
            this.device.on('data', function(data) {
                if ( data.indexOf("SerialCommanderError") >=0 ) {
                    me.logError("Serial error: " + data.replace('SerialCommanderError', ''));
                } else {
                    var parsed = me.serialToData(data);
                    me.parent.relayData(parsed, data);
                }
            });
            
            // add a "error" listener
            this.device.on('error', function(err) {
                me.logError("microControllerSerial - got serial error: " + err.message);
            });

        } else {
            this.logError("microControllerSerial - No serial device specified.");
            this.list();
        }
    },
    logError: function(msg) {
        console.log(msg);
        this.parent.relayError(msg);
    },
    serialToData: function(data) {
        var cmd = data.substring(0, 5);
        var rest = data.substring(5);
        var args = rest.split(",");
        switch(cmd) {
            case "bpm  " :
                return { bpm : (parseInt(rest)/10) };  // speed "echo" from device, divide by 10 so the protocol only deals with integers
            case "step " :
                return { step : parseInt(args[0]) };  // when the step updates
            case "note " :
                return { note : parseInt(args[0]), val: parseInt(args[1]) };  // note change "echo"
        }
        return null;
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
    dump: function() {
        this.sendRawData(this.CMD_DUMP+"\n");
    },
    play : function() {
        this.sendRawData(this.CMD_PLAY+"\n");
    },
    stop : function() {
        this.sendRawData(this.CMD_STOP+"\n");
    },
    pause : function() {
        this.sendRawData(this.CMD_PAUSE+"\n");
    },
    reset : function() {
        this.sendRawData(this.CMD_RESET+"\n");
    },
    next : function() {
        this.sendRawData(this.CMD_NEXT+"\n");
    },
    prev : function() {
        this.sendRawData(this.CMD_PREV+"\n");
    },
    setNoise : function(noise) {
        this.sendRawData(this.CMD_NOISE + (noise? "1" : "0") + "\n");
    },
    setNoiseColor : function(col) {
        this.sendRawData(this.CMD_NZCOL + col + "\n");
    },
    sendRawData : function(data) {
        if ( this.writing ) {
            this.logError("microControllerSerial - write in progress, can not sendRawData at this time: " + JSON.stringify(data));
            return false;
        } else {
            this.writing = true;
            let that = this;
            this.sendToDevice(data, function(err) {
                if ( err != null ) {
                    that.logError("microControllerSerial - error writing raw data to serial port: " + err.message);
                }
                that.writing = false;
            });
            return true;
        }
    },
    sendBatch : function(data) {
        if ( this.writing ) {
            this.logError("microControllerSerial - write in progress, can not sendBatch at this time: " + JSON.stringify(data));
            return false;
        } else {
            this.writing = true;
            let that = this;
            BucketBrigade(data, function(idx, item, next) {
                var parsed = that.parseData(item);
                that.sendToDevice(parsed, function(err, res) {
                    if ( err != null ) {
                        that.logError("microControllerSerial - error writing data to serial port: " + err.message);
                    }
                    setTimeout(function(){ next(); }, that.throttleTime);
                    // next();
                });
            }, function() {
                console.log("microControllerSerial - finished writing batch data to serial port");
                that.writing = false;
            });
            return true;
        }
    },
    sendData : function(data) {
        if ( this.writing ) {
            this.logError("microControllerSerial - write in progress, can not sendData at this time: " + JSON.stringify(data));
            return false;
        } else {
            this.writing = true;
            let that = this;
            var parsed = this.parseData(data);
            this.sendToDevice(parsed, function(err) {
                if ( err != null ) {
                    that.logError("microControllerSerial - error writing data to serial port: " + err.message);
                }
                that.writing = false;
            });
            return true;
        }
    },
    parseData: function(data) {
        var parsed = "";
        // parse speed params into a serial message
        if ( (data.speed != null) || (data.multiplier != null) ) {
            var bpm = this.updateInternals(data.speed, data.multiplier);
            parsed = this.CMD_BPM + "" + parseInt( bpm.toFixed(1) * 10) + "\n"; // multiply by 10 so the protocol only deals with integers
        } else if ( data.mode != null ) {
            parsed = this.CMD_MODE + ((data.mode=="arp") ? "1" : "0") + "\n";
        } else if ( data.output != null && data.step != null ) {
            parsed = this.CMD_NOTE + "" + data.output + "," + data.step + "," + data.val + "\n";
        } else if ( data.gate != null ) {
            parsed = this.CMD_GATE + "" + data.gate + "\n";
        } else if ( data.shmode != null ) {
            parsed = this.CMD_SHMOD + ((data.shmode=="follow") ? "1" : "0") + "\n";
        } else if ( data.reset != null ) {
            parsed = this.CMD_STRST + data.reset + "," + ((data.val==true) ? "1" : "0") + "\n";
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
    sendToDevice : function(data, callback) {
        if ( this.device != null ) {
            let that = this;
            console.log("Sending data to device: " + data);
            this.device.write(data, function(err, res) {
                that.device.drain(function(err, res) {
                    callback(err);
                });
            });
        }
    }
}

// BucketBrigade - provides serial iteration over a collection of async operations
//  - items is the list to iterate over
//  - itemHandler - form: function(itemIndex, item, next), must invoke next() when complete
//  - done is called when all items have been handled (iteration complete)
function BucketBrigade(items, itemHandler, done) {
    var ndx = 0;
    function next() {
        ndx++;
        if (ndx === items.length) {
            done();
        } else {
            itemHandler(ndx, items[ndx], next);
        }
    }
    itemHandler(0, items[0], next); // start the chain with the first item
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
        this.speed = config.speed;
        this.multiplier = config.multiplier;
        this.range = config.range;
        this.offset = config.offset;
        this.initialOffset = config.offset;
        this.offsetMult = 2;
        this.maxSteps = 16;
        this.resets = new Array(this.maxSteps);
        this.resets[this.maxSteps-1] = true;
        this.step = 0;
    },
    list: function() {
        var theList = ["/dev/asdf (a device when there is no device)", "/dev/cu.usbmodemxxx (Arduino (www.arduino.cc)) **"];
        this.parent.window.webContents.send( "on-update", { list: theList } );
    },
    dump: function() {
        var settings = {
            mode: "seq",
            speed: 1200,
            gatewidth: 57,
            steps : [
                {v1: 3200, v2: 2400, enabled: true, reset: false},
                {v1: 2400, v2: 3200, enabled: true, reset: false},
                {v1: 3200, v2: 2400, enabled: true, reset: false},
                {v1: 2400, v2: 3200, enabled: true, reset: false},
                {v1: 3200, v2: 2400, enabled: true, reset: false},
                {v1: 2400, v2: 3200, enabled: true, reset: false},
                {v1: 3200, v2: 2400, enabled: true, reset: false},
                {v1: 2400, v2: 3200, enabled: true, reset: false},
                {v1: 3200, v2: 2400, enabled: true, reset: false},
                {v1: 2400, v2: 3200, enabled: true, reset: false},
                {v1: 3200, v2: 2400, enabled: true, reset: false},
                {v1: 2400, v2: 3200, enabled: true, reset: false},
                {v1: 3200, v2: 2400, enabled: true, reset: false},
                {v1: 2400, v2: 3200, enabled: true, reset: false},
                {v1: 3200, v2: 2400, enabled: true, reset: false},
                {v1: 2400, v2: 3200, enabled: true, reset: true}
            ]
        };
        this.parent.window.webContents.send( "on-update", { settings: settings } );
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
        if ( (this.resets[this.step] == true) || (this.step >= (this.maxSteps-1)) ) {
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
    sendBatch : function(data) {
        console.log("microControllerSim - starting batch data write operation");
        var startTime = lastTime = new Date().getTime();
        BucketBrigade(data, function(idx, item, next) {
            setTimeout(function() {
                var current = new Date().getTime();
                var since = current - lastTime;
                var elapsed = current - startTime;
                console.log("microControllerSim - batch data write, item: " + idx + " written to serial port at: " + since + ", elaspsed: " + elapsed);
                lastTime = current;
                next();
            }, Math.floor(Math.random() * 10));
        }, function() {
            console.log("microControllerSim - finished writing batch data to serial port");
        });
    },
    sendData: function(data) {
        if ( (data.speed != null) || (data.multiplier != null) ) {
            var bpm = this.updateInternals(data.speed, data.multiplier);
            this.parent.window.webContents.send( "on-update", { bpm: bpm  } );
        }
        if ( data.reset ) {
            var step = data.reset;
            if (step < this.maxSteps-1) {
                this.resets[step] = data.val;
                console.log( "microControllerSim - reset array change - value: " + this.resets);
            }
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
