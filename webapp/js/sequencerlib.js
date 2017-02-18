// sequencer hardware/container "service"
sequencerContainer = function(config) {
    if ( arguments.length > 0 ) this.init(config);
};
sequencerContainer.prototype = {
	init: function(config) {
        this.config = config;
	    this.container = null;
        this.evtHandlers = {};
        this.dataHandlers = [];
        this.errHandlers = [];
        this.createContainee();
	},
    createContainee: function() {
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
    },
    addEventHandler: function(evtName, callback) {
        this.evtHandlers[evtName] = callback;
    },
    addDataHandler: function(callback) {
        this.dataHandlers[this.dataHandlers.length] = callback;
    },
    addErrorHandler: function(callback) {
        this.errHandlers[this.errHandlers.length] = callback;
    },
    wireContainer: function(container) {
        this.container = container;
        this.initContainer(this.config);
        this.getInfo();
    },
    hasContainer: function() {
        return (this.container != null);
    },
    getInfo: function() {
        this.sendEvent("info");
    },
    initContainer: function(config) {
        this.sendEvent("init", config);
    },
    list: function() {
        this.sendEvent("list");
    },
    start: function() {
        this.sendEvent("play");
    },
    pause: function() {
        this.sendEvent("pause");
    },
    reset: function() {
        this.sendEvent("reset");
    },
    stop: function() {
        this.sendEvent("stop");
    },
    next: function() {
        this.sendEvent("next");
    },
    prev: function() {
        this.sendEvent("prev");
    },
    setNoise: function(noiz) {
        this.sendEvent("noise", noiz);
    },
    setNoiseColor: function(col) {
        this.sendEvent("nzcol", col);
    },
    sendData: function(data) {
        this.sendEvent("data", data);
    },
    sendRawData: function(data) {
        this.sendEvent("rawdata", data);
    },
    sendBatch: function(data) {
        this.sendEvent("batch", data);
    },
    sendEvent: function(evt, data) {
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



// sequencer step with slider, enabler and step indicator
sequencerStep = function(config) {
    if ( arguments.length > 0 ) this.init(config);
};
sequencerStep.prototype = {
    init: function(config) {
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
        this.addElements(config.parentSelector);
    },
    addElements: function(parentSel) {
        var that = this;
        var parent = $(parentSel);
        parent.append('<div id="' + this.id + '" class="seqStepOuter"></div>');
        var stepOuter = parent.find('#' + this.id);
        stepOuter.append('<div class="seqStep"></div>');
        var step = stepOuter.find('.seqStep');
        step.append('<div class="stepIndicator clearfix"><div class="stepLED pull-left"></div><div class="stepValue text-center pull-right"></div></div>')
            .append('<div class="stepSlider"></div>')
            .append('<div class="stepToggle clearfix"><a class="btn btn-sm pull-left"></a><a class="btn btn-sm pull-right">Rst</a></div>');
        this.indicatorElem = step.find('.stepIndicator .stepLED')[0];
        this.valueElem = step.find('.stepIndicator .stepValue')[0];
        this.sliderElem = step.find('.stepSlider')[0];
        this.toggleElem = step.find('.stepToggle .btn')[0];
        this.resetElem = step.find('.stepToggle .btn')[1];
        $(this.toggleElem).click(function() {
            that.enabled = !that.enabled;
            that.updateToggle();
            if (that.toggleHandler!= null) {
                that.toggleHandler( that.stepIndex, that.enabled );
            }
        });
        $(this.resetElem).click(function() {
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
        this.updateSlider();
        this.updateVal();
        this.updateToggle();
        this.updateReset();
    },
    addSlider: function(elem) {
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
    },
    addHandlers: function(ontoggle, onslide, onreset) {
        this.toggleHandler = ontoggle;
        this.slideHandler = onslide;
        this.resetHandler = onreset;
    },
    setCurrent: function() {
        $(this.indicatorElem).addClass('enabled');
    },
    resetCurrent: function() {
        $(this.indicatorElem).removeClass('enabled');
    },
    updateToggle: function() {
        if ( this.enabled ) {
            $(this.toggleElem).removeClass('btn-off').addClass('btn-danger').text(this.labels[1]);
        } else {
            $(this.toggleElem).addClass('btn-off').removeClass('btn-danger').text(this.labels[0]);
        }
    },
    updateReset: function() {
        if ( this.reset ) {
            $(this.resetElem).removeClass('btn-off').addClass('btn-danger');
        } else {
            $(this.resetElem).addClass('btn-off').removeClass('btn-danger');
        }
    },
    updateSlider: function() {
        this.sliderElem.noUiSlider.set(this.val);
    },
    updateVal: function() {
        var pct = (this.val / 4095) * 100;
        $(this.valueElem).text(pct.toFixed(1) + '%');
    },
    update: function(enabled, val, reset) {
        this.enabled = enabled;
        this.val = val;
        this.reset = reset;
        this.updateSlider();
        this.updateVal();
        this.updateToggle();
    }
}

// arpeggiator step with slider, enabler and step indicator
arpStep = function(config) {
    if ( arguments.length > 0 ) this.init(config);
};
arpStep.prototype = new sequencerStep();
arpStep.prototype.noteNames = ["ROOT","m2", "M2", "m3", "M3", "P4", "b5", "P5", "m6", "M6", "m7", "M7", "OCT"];
arpStep.prototype.addSlider = function(elem) {
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
arpStep.prototype.updateVal = function() {
    var val = this.noteNames[parseInt(this.val)];
    $(this.valueElem).text(val);
};




/*********************************************
 ****************** TESTING ******************
 *********************************************/




// a fake container for testing, simulates hardware/container feedback
fakeContainer = function() {};
fakeContainer.prototype = {
    init: function(config) {
        this.maxSteps = config.maxSteps;
        this.resets = config.resets;
        this.speed = config.speed;
        this.multiplier = config.multiplier;
        this.range = config.range;
        this.offset = config.offset;
        this.initialOffset = config.offset;
        this.offsetMult = 2;
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
        if ( (this.resets[this.step] == true) || (this.step >= this.maxSteps) ) {
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
        if ( data.resets ) {
            this.resets = data.resets;
            console.log( "FakeContainer - reset array change - value: " + data.resets);
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
