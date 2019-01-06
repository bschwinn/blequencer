// sequencer hardware/container "service"
class sequencerContainer {
	constructor(config) {
        this.config = config;
	    this.container = null;
        this.evtHandlers = {};
        this.dataHandlers = [];
        this.errHandlers = [];
        this.createContainee();
	}
    createContainee() {
        var that = this;
        window.__containee = {
            on: function(evt, data) {
                console.log("Got an event: " + evt + ", it had some data: " + JSON.stringify(data) + ", handler? " + (that.evtHandlers[evt] != null))
                if (that.evtHandlers[evt] != null) {
                    that.evtHandlers[evt](data);
                }
            },
            onUpdate: function(data) {
                for ( var i=0; i<that.dataHandlers.length; i++ ) {
                    that.dataHandlers[i](data);
                }
            },
            onError: function(data) {
                for ( var i=0; i<that.errHandlers.length; i++ ) {
                    that.errHandlers[i](data);
                }
            }
        };
    }
    addEventHandler(evtName, callback) {
        this.evtHandlers[evtName] = callback;
    }
    addDataHandler(callback) {
        this.dataHandlers[this.dataHandlers.length] = callback;
    }
    addErrorHandler(callback) {
        this.errHandlers[this.errHandlers.length] = callback;
    }
    wireContainer(container) {
        this.container = container;
        this.initContainer(this.config);
        this.getInfo();
    }
    hasContainer() {
        return (this.container != null);
    }
    getInfo() {
        this.sendEvent("info");
    }
    initContainer(config) {
        this.sendEvent("init", config);
    }
    list() {
        this.sendEvent("list");
    }
    dump() {
        this.sendEvent("dump");
    }
    start() {
        this.sendEvent("play");
    }
    pause() {
        this.sendEvent("pause");
    }
    reset() {
        this.sendEvent("reset");
    }
    stop() {
        this.sendEvent("stop");
    }
    next() {
        this.sendEvent("next");
    }
    prev() {
        this.sendEvent("prev");
    }
    setNoise(noiz) {
        this.sendEvent("noise", noiz);
    }
    setNoiseColor(col) {
        this.sendEvent("nzcol", col);
    }
    sendData(data) {
        this.sendEvent("data", data);
    }
    sendRawData(data) {
        this.sendEvent("rawdata", data);
    }
    sendBatch(data) {
        this.sendEvent("batch", data);
    }
    sendEvent(evt, data) {
        if ( this.container ) {
            this.container.send(evt, data);
        }
    }
};


// container for iOS, needed because iOS/WKWebView
iOSContainer = function() {};
iOSContainer.prototype = {
    send: function(evt, data) {
        if ( window.webkit != null ) {
            var pipe = window.webkit.messageHandlers[evt];
            if ( pipe != null ) {
                pipe.postMessage(data);
            }
        }
    }
}

// chord chart editor - allows changing positions, maj/min and deleting
class sequencerStep {
	constructor(config) {
        this.idpref = config.idpref || "step_";
        this.enabled = config.enabled;
        this.stepIndex = config.stepIndex;
        this.id = this.idpref + this.stepIndex;
        this.val = config.val;
        this.reset = config.reset || false;
        this.labels = ["Off", "On"];
        this.toggleHandler = null;
        this.slideHandler = null;
        this.indicatorElem = null;
        this.sliderElem = null;
        this.toggleElem = null;
        this.resetElem = null;
        this.template = '#tmplSequencerStep';
        this.rootPath = '.seqStepOuter';
        this.sliderPath = '.stepSlider';
        this.indicatorPath = '.stepIndicator .stepLED';
        this.valuePath = '.stepIndicator .stepValue';
        this.addElements(config.parentSelector);
    }
    addElements(parentSel) {
        var that = this;
	    var tmpl = document.querySelector(this.template);
		var clone = document.importNode(tmpl.content, true);
        clone.querySelector(this.rootPath).setAttribute('id', this.id);
        this.indicatorElem = clone.querySelector(this.indicatorPath);
        this.valueElem = clone.querySelector(this.valuePath);
        this.sliderElem = clone.querySelector(this.sliderPath);
        this.toggleElem = clone.querySelectorAll('.stepToggle .btn')[0];
        this.resetElem = clone.querySelectorAll('.stepToggle .btn')[1];
        this.toggleElem.addEventListener('click', function() {
            that.enabled = !that.enabled;
            that.updateToggle();
            if (that.toggleHandler!= null) {
                that.toggleHandler( that.stepIndex, that.enabled );
            }
        });
        this.resetElem.addEventListener('click', function() {
            that.reset = !that.reset;
            that.updateReset();
            if (that.resetHandler!= null) {
                that.resetHandler( that.stepIndex, that.reset );
            }
        });
        this.addSlider(this.sliderElem);
        this.sliderElem.noUiSlider.on('slide', function(values, handle, unencoded)  {
            that.val = values[handle];
            that.updateVal();
            if ( that.slideHandler != null ) {
                that.slideHandler( that.stepIndex, that.val, that.enabled );
            }
        });
        document.querySelector(parentSel).appendChild(clone);
    }
    init() {
        this.updateSlider();
        this.updateVal();
        this.updateToggle();
        this.updateReset();
    }
    addSlider(elem) {
        noUiSlider.create(elem, {
            start: 2047,
            orientation: "vertical",
            direction: 'rtl',
            range: {
                'min': 0,
                'max': 4095
            },
            pips: {
                mode: 'positions',
                values: [0,50,100],
                density: 4
            }
        });
    }
    addHandlers(ontoggle, onslide, onreset) {
        this.toggleHandler = ontoggle;
        this.slideHandler = onslide;
        this.resetHandler = onreset;
    }
    setCurrent() {
        this.indicatorElem.classList.add('enabled');
    }
    resetCurrent() {
        this.indicatorElem.classList.remove('enabled');
    }
    updateToggle() {
        if ( this.enabled ) {
            this.toggleElem.classList.remove('btn-off');
            this.toggleElem.classList.add('btn-danger')
            this.toggleElem.innerText  = this.labels[1];
        } else {
            this.toggleElem.classList.remove('btn-danger')
            this.toggleElem.classList.add('btn-off');
            this.toggleElem.innerText  = this.labels[0];
        }
    }
    updateReset() {
        if ( this.reset ) {
            this.resetElem.classList.remove('btn-off');
            this.resetElem.classList.add('btn-danger')
        } else {
            this.resetElem.classList.remove('btn-danger')
            this.resetElem.classList.add('btn-off');
        }
    }
    updateSlider() {
        this.sliderElem.noUiSlider.set(this.val);
    }
    updateVal() {
        var pct = (this.val / 4095) * 100;
        this.valueElem.innerText = (pct.toFixed(1) + '%');
    }
    update(enabled, val, reset) {
        this.enabled = enabled;
        this.val = val;
        this.reset = reset;
        this.updateSlider();
        this.updateVal();
        this.updateToggle();
    }
}

class arpStep extends sequencerStep {
    constructor(config) {
        super(config);
        this.noteNames = ["ROOT","m2", "M2", "m3", "M3", "P4", "b5", "P5", "m6", "M6", "m7", "M7", "OCT"];
    } 
    addSlider(elem) {
        noUiSlider.create(elem, {
            start: 6,
            orientation: "vertical",
            direction: 'rtl',
            step: 1,
            range: {
                'min': 0,
                'max': 13
            },
            pips: {
                mode: 'steps',
                density: 13
            }
        });
    };
    updateVal() {
        var val = this.noteNames[parseInt(this.val)];
        this.valueElem.innerText = val;
    }
}


class potentiometer {
	constructor(id, config) {
        this.id = id;
        this.width = config.width;
        this.height = config.height;
        this.min = config.min || 0;
        this.max = config.max || 11;
        this.value = config.value || 7;
        this.sensitivity = config.sensitivity || 0.01;
        this.rotate = config.rotate || function(){};
        this.MAX_ROT = 315;
		this.template = '<div class="_potentiometer"><div class="_potentiometer_top"></div><div class="_potentiometer_base"></div></div>';
    }
    render() {
        var par = document.getElementById(this.id);
        par.innerHTML = this.template;
        var pot = par.querySelector('._potentiometer');
        var potTop = par.querySelector('._potentiometer_top');
        var potBase = par.querySelector('._potentiometer_base');
        pot.style.width = this.width;
        pot.style.height = this.height;
        potTop.style.width = this.width;
        potTop.style.height = this.height;
        potBase.style.width = this.width;
        potBase.style.height = this.height;

        var startDeg = -1;
        var currentDeg = 0;
        var rotation = 0;
        var lastDeg = 0;

        // map value to rotation
        var initRat = 0;
        if ( this.value >= this.min && this.value <= this.max ) {
            initRat = (this.value-this.min) / (this.max - this.min)
        }
        var currentDeg = initRat * this.MAX_ROT;
        potTop.style.transform = 'rotate('+(currentDeg)+'deg)';
        this.rotate(currentDeg/this.MAX_ROT);

        let that = this;
		pot.addEventListener('mousedown', function(e){

            e.preventDefault();
            var initialVert = e.pageY;
            var calcRat;

            function mouseMv(e){
                var newVert = e.pageY;
                if ( newVert > initialVert) {
                    calcRat = initRat - (that.sensitivity * (newVert - initialVert));
                } else {
                    calcRat = initRat + (that.sensitivity * (initialVert - newVert));
                }

                if ( calcRat >= 1 ) {
                    calcRat = 1;
                }
                if ( calcRat <= 0 ) {
                    calcRat = 0;
                }
                currentDeg = calcRat * that.MAX_ROT;

                potTop.style.transform = 'rotate('+(currentDeg)+'deg)';
                that.rotate(currentDeg/that.MAX_ROT);
            }
			document.addEventListener('mousemove',mouseMv);

			document.addEventListener('mouseup', function mouseUp(e){
                document.removeEventListener('mousemove', mouseMv);
                document.removeEventListener('mousemove', mouseUp);
                initRat = calcRat;
            });

		});
    }
}


/*********************************************
 ****************** TESTING ******************
 *********************************************/




// a fake container for testing, simulates hardware/container feedback
fakeContainer = function() {};
fakeContainer.prototype = {
    init: function(config) {
        this.speed = config.speed;
        this.multiplier = config.multiplier;
        this.range = config.range;
        this.offset = config.offset;
        this.initialOffset = config.offset;
        this.offsetMult = 2;
        this.maxSteps = 16;
        this.resets = new Array(this.maxSteps);
        this.resets[this.maxSteps-1] = true;
        this.timer = null;
        this.step = 0;
    },
    info: function() {
        window.setTimeout(function(){ window.__containee.on( "on-info", { name: "BLEquencer - JS Testing", version: "0.0.0", features: "BLE" } ); }, 10);
    },
    send: function(evt, data) {
        switch(evt) {
            case "init" :
                this.init(data);
                break;
            case "info" :
                this.info();
                break;
            case "list" :
                this.list();
                break;
            case "dump" :
                this.dump();
                break;
            case "play" :
                this.play();
                break;
            case "pause" :
                this.pause();
                break;
            case "stop" :
                this.stop();
                break;
            case "reset" :
                this.reset();
                break;
            case "next" :
                this.next();
                break;
            case "prev" :
                this.prev();
                break;
            case "data" :
                this.sendData(data);
                break;
            case "rawdata" :
                this.sendRawData(data);
                break;
            case "batch" :
                this.sendBatch(data);
                break;
        }
    },
    list: function() {
        var theList = ["/dev/asdf (a device when there is no device)", "/dev/cu.usbmodemxxx (Arduino (www.arduino.cc)) **"];
        window.setTimeout(function(){ window.__containee.onUpdate( { list: theList } ); }, 10);
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
        window.setTimeout(function(){ window.__containee.onUpdate( { settings: settings } ); }, 10);
    },
    play: function() {
        that = this;
        if ( this.timer == null) {
            var bpm = this.calculateBPM(this.speed);
            this.timer = this.setVariableInterval(function(){
                that.next();
            }, this.calculateInterval(bpm));
            window.setTimeout(function(){ window.__containee.onUpdate( { bpm: bpm } ); }, 10);
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
        window.setTimeout(function(){ window.__containee.onUpdate( { step: 0 } ); }, 10);
    },
    reset: function() {
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
        // fake events coming back from microcontroller/container
        window.setTimeout(function(){ window.__containee.onUpdate( { step: that.step } ); }, 10);
    },
    prev: function() {
        if ( this.step == 0) {
            this.step = this.getFirstReset();
        } else {
            this.step--;
        }
        var that = this;
        // fake events coming back from microcontroller/container
        window.setTimeout(function(){ window.__containee.onUpdate( { step: that.step } ); }, 10);
    },
    getFirstReset: function() {
        for (var i=0; i<this.resets.length; i++ ) {
            if ( this.resets[i] == true ) {
                return i;
            }
        }
    },
    callUp: function(name, data) {
        var url = "sequencer://{ \"functionname\" : \"" + name + "\", \"data\" : \"" + data + "\" }";

        console.log("FakeContainer calling container url: " + url );

        // fake container response to getInfo
        if ( name == "getInfo" ) {
            window.setTimeout(function(){ window.__containee.onUpdate( { name: "Sequencer", version: "1.2.3" } ); }, 10);
        }
    },
    sendBatch: function(data) {
        for ( var i=0; i<data.length; i++ ) {
            this.sendData(data[i]);
        }
    },
    sendRawData: function(data) {
        console.log("FakeContainer got raw data: " + data);
        window.setTimeout(function(){ window.__containee.onUpdate( { "raw" : data } ); }, 10);
    },
    sendData: function(data) {
        if ( (data.speed != null) || (data.multiplier != null) ) {
            var bpm = this.updateInternals(data.speed, data.multiplier);
            // fake events coming back from microcontroller/container
            window.setTimeout(function(){ window.__containee.onUpdate( { bpm: bpm } ); }, 10);
        }
        // no fake events for things in each bank - no microcontroller/container feedback here
        if ( data.output != null ) {
            console.log( "FakeContainer data: " + JSON.stringify(data) );
        }
        // no fake events for output voltage changes - no microcontroller/container feedback here
        if ( data.level != null ) {
            console.log( "FakeContainer - output change - value: " + data.level);
        }
        if ( data.envelope != null ) {
            console.log(`FakeContainer - envelope change - env: ${data.envelope}, state: ${data.state}, value: ${data.val}`);
        }
        if ( data.reset ) {
            var step = data.reset;
            if (step < this.maxSteps-1) {
                this.resets[step] = data.val;
                console.log( "FakeContainer - reset array change - value: " + this.resets);
            }
        }
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
                window.clearTimeout(this.timeout);
            },
            start: function() {
                this.stopped = false;
                return this.loop();
            },
            loop: function() {
                this.timeout = window.setTimeout(this.runLoop, this.interval);
                return this;
            }
        };
        return variableInterval.start();
    }

}
