/*
 * ~~~~~~~ Sequentiator ~~~~~~~
 * 
 * Combination sequencer and arpeggiator.  2 Analog outputs.
 * - Analog output 1 can be either bank1 or arpeggiator
 * - Analog output 2 is always bank2
 */

// data model helpers
populateSteps = function(len, alt) {
	var steps = [];
	for ( var i=0; i<len; i++ ) {
		var val = ( alt ) ?  256*(len-i) :  256*i;
		steps[steps.length] = { idx: i, enabled: true, val: val }
	}
	return steps;
}
populateArpSteps = function(len) {
	var steps = [];
	for ( var i=0; i<len; i++ ) {
		var val = i % 12;
		steps[steps.length] = { idx: i, enabled: true, val: val }
	}
	return steps;
}
populateResets = function(len) {
	var resets = [];
	for ( var i=0; i<len; i++ ) {
		resets[resets.length] = false;
	}
	resets[resets.length-1] = true;
	return resets;
}
// number of steps, reset can be less
var numberOfSteps = 16;
var resets = populateResets(numberOfSteps);
// sequencer has two fully variable banks and one arpeggiator bank
var BANK_1 = 1;
var BANK_2 = 2;
var selectedBank = BANK_1;
var stepsBank1 = populateSteps(numberOfSteps, false);
var stepsBank2 = populateSteps(numberOfSteps, true);
var arpSteps = populateArpSteps(numberOfSteps, false);
// master output CV offset and BPM
var masterOutput = 127;
var masterSpeed = 2047;
// output mode selector - arpegiator vs. standard sequencer
var MODE_SEQ = 0;
var MODE_ARP = 1;
var OUT_1 = 1;
var OUT_2 = 2;
var selectedMode = MODE_SEQ;
// noise ?
var noiseEnabled = false;
// sequencer states
var STATE_PLAYING = 1;
var STATE_STOPPED = 2;
var STATE_PAUSED = 3;
var sequencerState = STATE_STOPPED;
var currentStep = 0;
// to reference all the sliders
var stepUIObjects = [];
var arpStepUIObjects = [];
// sequencer speed
var SPEED_MULT_HALF = 0.5;
var SPEED_MULT_1X = 1;
var SPEED_MULT_2X = 2;
var multiplier = SPEED_MULT_1X;
// received from container/uController
var bpm = 0;
// sample/hold
var SHMODE_NORMAL = 0;
var SHMODE_FOLLOW = 1;
var selectedSHMode = SHMODE_NORMAL;

// global function for container to register itself
// iOS needs a wrapper, OSX injects an implementation
window.__registerContainer = function(os) {
    if ( os == 'iOS' ) {
        seqCont.wireContainer( new iOSContainer() );
    } else if ( os == 'OSX' ) {
        seqCont.wireContainer( window.__container );
    } else if ( os == 'fake' ) {
        seqCont.wireContainer( new fakeContainer() );
    } else {
        console.log("Error: unrecognized container.");
        return;
    }
}


// initialize container
var seqConf = { speed: masterSpeed, multiplier: 1, range: 200, offset: 50 };
var seqCont = new sequencerContainer(seqConf);
seqCont.addEventHandler( "on-info", function(data) {
	updateSeqInfo(data);
});
seqCont.addDataHandler( function(data) {
	console.log("data handler: " + JSON.stringify(data));
	if ( data.step != null ) {
		updateCurrentStep(data.step);
	}
	if ( data.bpm != null ) {
		updateBPM(data.bpm);
	}
	if ( data.raw != null ) {
		updateConsole(data.raw, false);
	}
	if ( data.list != null ) {
		updateConsole("Device List:")
		for ( var i=0; i<data.list.length; i++ ){
			updateConsole(' - ' + data.list[i], false);
		}
	}
	if ( data.settings != null ) {
		updateConsole("Device Settings:")
		updateConsole(JSON.stringify(data.settings), false);
	}
	if ( data.stepSettings != null ) {
		updateConsole(JSON.stringify(data.stepSettings), false);
	}
});
seqCont.addErrorHandler( function(data) {
    console.error(data);
	updateConsole(data, true);
});

// start/stop/pause the sequencer
seqStart = function() {
	sequencerState = STATE_PLAYING;
	seqCont.start();
	updateTransportButtons();
}
seqStop = function() {
	sequencerState = STATE_STOPPED;
	seqCont.stop();
	updateTransportButtons();
}
seqPause = function() {
	sequencerState = STATE_PAUSED;
	seqCont.pause();
	updateTransportButtons();
}
// advance the sequencer one step (while paused)
seqNext = function() {
	seqCont.next();
}
// backup the sequencer one step (while paused)
seqPrev = function() {
	seqCont.prev();
}
// reset the sequencer to zero
seqReset = function() {
	seqCont.reset();
}
// tap tempo
seqTap = function() {
	console.log("Tap tempo hit");
}

// speed slider handling
handleSpeedSlider = function(values, handle, unencoded) {
	masterSpeed = values[handle];
	seqCont.sendData( { speed: masterSpeed } );
}
// speed slider handling
handleGateSlider = function(values, handle, unencoded) {
	gateWidth = parseInt(values[handle]);
	document.querySelector('#gateWidth').innerText = gateWidth + '%';
	seqCont.sendData( { gate: gateWidth } );
}
// output voltage slider handling
handleOutputSlider = function(values, handle, unencoded) {
	masterOutput = values[handle];
	seqCont.sendData( { level: masterOutput } );
}
// enable/diable a single step
handleStepToggle = function(idx, enabled) {
	var steps = ( selectedBank == BANK_1 ) ? stepsBank1 : stepsBank2;
	steps[idx].enabled = enabled;
	seqCont.sendData( { output: (( selectedBank == BANK_1 ) ? OUT_1 : OUT_2), step: idx, enabled: enabled } );
}
handleArpStepToggle = function(idx, enabled) {
	arpSteps[idx].enabled = enabled;
	seqCont.sendData( { output: OUT_1, step: idx, enabled: enabled } ); // Bank/Output is locked at 1 for arp
}
// set the value (CV) for a step
handleStepSlider = function(idx, val, onoff) {
	var steps = ( selectedBank == BANK_1 ) ? stepsBank1 : stepsBank2;
	steps[idx].val = val;
	seqCont.sendData( { output: (( selectedBank == BANK_1 ) ? OUT_1 : OUT_2), step: idx, val: val, enabled: onoff } );
}
handleArpStepSlider = function(idx, val, onoff) {
	arpSteps[idx].val = val;
	seqCont.sendData( { output: OUT_1, step: idx, val: val, enabled: onoff } );  // Bank/Output is locked at 1 for arp
}
// visually disable all steps after the first reset
// pass step reset up to container
handleStepReset = function(idx, val) {
	// prevent turning off step 16
	if (idx < numberOfSteps-1) {
		resets[idx] = val;
		seqCont.sendData( { reset: idx, val: val } );

		var anyResets = false;
		for ( var i=0; i<resets.length; i++ ) {
			if ( !anyResets ) {
				document.querySelector('#step_'+i+' .seqStep').classList.remove('disabled');
				document.querySelector('#arpstep_'+i+' .seqStep').classList.remove('disabled');
			} else {
				document.querySelector('#step_'+i+' .seqStep').classList.add('disabled');
				document.querySelector('#arpstep_'+i+' .seqStep').classList.add('disabled');
			}
			if ( resets[i] == true ) {
				anyResets = true;
			}
		}
	}
}
// set the speed multiplier
setMultiplier = function(mult) {
	multiplier = mult;
	seqCont.sendData( { multiplier: mult } );
	updateSpeedButtons();
}
// select the sequencer bank
setBank = function(bank) {
	selectedBank = bank;
	updateStepValues();
	updateStepDisplay();
	updateBankButtons();
}
setMode = function(mode) {
	function getAllStepData(arr) {
		var ret = [];
		for(var i=0; i<arr.length; i++) {
			var thing = { output: OUT_1, step: i, val: arr[i].val, enabled: arr[i].enabled, reset: resets[i] };
			ret[ret.length] = thing;
		}
		return ret;
	}
	selectedMode = mode;
	var batch = getAllStepData((mode==MODE_ARP) ? arpSteps : stepsBank1);
	batch.unshift({ mode: ((mode==MODE_ARP) ? "arp" : "seq") } );
	seqCont.sendBatch( batch );
	updateStepValues();
	updateStepDisplay();
	updateSelectedMode();
}
setSHMode = function(shmode) {
	selectedSHMode = shmode;
	seqCont.sendData( { shmode: ((shmode==SHMODE_NORMAL) ? "normal" : "follow") } );
	updateSelectedSHMode();
}
// bpm data handler (from the sequencer)
updateBPM = function(bpm) {
	document.querySelector('#seqBPM').innerText = bpm.toFixed(1);
}

// update step values/toggles (useful for changing banks)
updateStepValues = function() {
	if ( selectedMode == MODE_ARP && selectedBank == BANK_1) {
		for ( var i=0;i<numberOfSteps;i++ ) {
			arpStepUIObjects[i].update(arpSteps[i].enabled, arpSteps[i].val, resets[i]);
		}
	} else {
		var steps = ( selectedBank == BANK_1 ) ? stepsBank1 : stepsBank2;
		for ( var i=0;i<numberOfSteps;i++ ) {
			stepUIObjects[i].update(steps[i].enabled, steps[i].val, resets[i]);
		}
	}
}
// update step values/toggles (useful for changing banks)
updateStepDisplay = function() {
	if ( selectedMode == MODE_ARP ) {
		if ( selectedBank == BANK_2 ) {
			document.querySelector('#sequenceRow1').style.display = 'block';
			document.querySelector('#sequenceRow2').style.display = 'block'
			document.querySelector('#arpRow1').style.display = 'none'
			document.querySelector('#arpRow2').style.display = 'none'
		} else {
			document.querySelector('#sequenceRow1').style.display = 'none'
			document.querySelector('#sequenceRow2').style.display = 'none'
			document.querySelector('#arpRow1').style.display = 'block';
			document.querySelector('#arpRow2').style.display = 'block';
		}
	} else {
		document.querySelector('#sequenceRow1').style.display = 'block';
		document.querySelector('#sequenceRow2').style.display = 'block';
		document.querySelector('#arpRow1').style.display = 'none'
		document.querySelector('#arpRow2').style.display = 'none'
	}
}
// update the version number from the container
updateSeqInfo = function(inf) {
	document.querySelector('#sequencerVersion').innerText = inf.version;
	document.querySelector('#sequencerName').setAttribute("title", inf.name);
	addRemoveClass('#sequencerStatus', 'glyphicon-flash', 'glyphicon-off');
}
// current step handler (from the sequencer)
updateCurrentStep = function(currStep) {
	for ( var i=0;i<numberOfSteps;i++ ) {
		stepUIObjects[i].resetCurrent();
		arpStepUIObjects[i].resetCurrent();
	}
	stepUIObjects[currStep].setCurrent();
	arpStepUIObjects[currStep].setCurrent();
}
// update the transport button states
updateTransportButtons = function(){
	if (sequencerState == STATE_PAUSED) {
		addRemoveClass('#seqPause', 'btn-warning', 'btn-default');
		addRemoveClass('#seqPrev', 'btn-primary', 'btn-default');
		addRemoveClass('#seqNext', 'btn-primary', 'btn-default');
		addRemoveClass('#seqPlay', 'btn-default', 'btn-warning');
		addRemoveClass('#seqStop', 'btn-default', 'btn-warning');

	} else if (sequencerState == STATE_PLAYING) {
		addRemoveClass('#seqPlay', 'btn-warning', 'btn-default');
		addRemoveClass('#seqStop', 'btn-default', 'btn-warning');
		addRemoveClass('#seqPause', 'btn-default', 'btn-warning');
		addRemoveClass('#seqPrev', 'btn-default', 'btn-primary');
		addRemoveClass('#seqNext', 'btn-default', 'btn-primary');
	} else {
		addRemoveClass('#seqStop', 'btn-warning', 'btn-default');
		addRemoveClass('#seqPause', 'btn-default', 'btn-warning');
		addRemoveClass('#seqPrev', 'btn-default', 'btn-primary');
		addRemoveClass('#seqNext', 'btn-default', 'btn-primary');
		addRemoveClass('#seqPlay', 'btn-default', 'btn-warning');
	}
}
// update the speed mult button states
updateSpeedButtons = function(){
	if (multiplier == SPEED_MULT_HALF) {
		addRemoveClass('#seqSpeedHalf', 'btn-warning', 'btn-default');
		addRemoveClass('#seqSpeed1X', 'btn-default', 'btn-warning');
		addRemoveClass('#seqSpeed2X', 'btn-default', 'btn-warning');
	} else if (multiplier == SPEED_MULT_2X) {
		addRemoveClass('#seqSpeedHalf', 'btn-default', 'btn-warning');
		addRemoveClass('#seqSpeed1X', 'btn-default', 'btn-warning');
		addRemoveClass('#seqSpeed2X', 'btn-warning', 'btn-default');
	} else {
		addRemoveClass('#seqSpeedHalf', 'btn-default', 'btn-warning');
		addRemoveClass('#seqSpeed1X', 'btn-warning', 'btn-default');
		addRemoveClass('#seqSpeed2X', 'btn-default', 'btn-warning');
	}
}
// update the bank button states
updateBankButtons = function(){
	if (selectedBank == BANK_1) {
		addRemoveClass('#bank1Selector', 'btn-warning', 'btn-default');
		addRemoveClass('#bank2Selector', 'btn-default', 'btn-warning');
	} else { // BANK_2
		addRemoveClass('#bank1Selector', 'btn-default', 'btn-warning');
		addRemoveClass('#bank2Selector', 'btn-warning', 'btn-default');
	}
}
// update the selected output (sequencer or arpeggiator)
updateSelectedMode = function() {
	if (selectedMode == MODE_ARP) {
		addRemoveClass('#arpModeSelector', 'btn-warning', 'btn-default');
		addRemoveClass('#seqModeSelector', 'btn-default', 'btn-warning');
	} else {
		addRemoveClass('#arpModeSelector', 'btn-default', 'btn-warning');
		addRemoveClass('#seqModeSelector', 'btn-warning', 'btn-default');
	}
}
// update the sample/hold mode buttons (normal or follow)
updateSelectedSHMode = function() {
	if (selectedSHMode == SHMODE_NORMAL) {
		addRemoveClass('#sampHoldNormalSelector', 'btn-warning', 'btn-default');
		addRemoveClass('#sampHoldFollowSelector', 'btn-default', 'btn-warning');
	} else {
		addRemoveClass('#sampHoldNormalSelector', 'btn-default', 'btn-warning');
		addRemoveClass('#sampHoldFollowSelector', 'btn-warning', 'btn-default');
	}
}

addRemoveClass = function(selector, add, remove) {
	var elem = document.querySelector(selector);
	elem.classList.remove(remove);
	elem.classList.add(add);
}

// update the console log
updateConsole = function(data, isError) {
	var clazz = isError ? "error" : "";
	var para = document.createElement('p');
	para.setAttribute('class', clazz);
	para.innerText = data;
	document.querySelector('#seqConsoleResponse').appendChild(para);
}

// initialize/create the transport buttons
initTransportButtons = function(){
	document.querySelector('#seqStop').addEventListener('click', function(){
		seqStop();
	});
	document.querySelector('#seqPlay').addEventListener('click', function(){
		seqStart();
	});
	document.querySelector('#seqPause').addEventListener('click', function(){
		seqPause();
	});
	document.querySelector('#seqReset').addEventListener('click', function(){
		seqReset();
	});
	document.querySelector('#seqPrev').addEventListener('click', function(){
		seqPrev();
	});
	document.querySelector('#seqNext').addEventListener('click', function(){
		seqNext();
	});
}
// initialize/create the speed sliders and buttons
initSpeedSlider = function(){
	var slider = document.querySelector('#speedSlider');
	noUiSlider.create(slider, {
		start: 2047,
		orientation: "vertical",
		direction: 'rtl',
		range: {
			'min': 0,
			'max': 4095
		},
		pips: {
			mode: 'positions',
			values: [0,100],
			density: 4
		}
	});
	slider.noUiSlider.on('slide', handleSpeedSlider);
}
initSpeedButtons = function(){
	document.querySelector('#seqSpeedHalf').addEventListener('click', function(){
		setMultiplier(SPEED_MULT_HALF);
	});
	document.querySelector('#seqSpeed1X').addEventListener('click', function(){
		setMultiplier(SPEED_MULT_1X);
	});
	document.querySelector('#seqSpeed2X').addEventListener('click', function(){
		setMultiplier(SPEED_MULT_2X);
	});
	document.querySelector('#seqSpeedTap').addEventListener('click', function(){
		seqTap();
	});
}
initBankButtons = function() {
	document.querySelector('#bank1Selector').addEventListener('click', function(){
		setBank(BANK_1);
	});
	document.querySelector('#bank2Selector').addEventListener('click', function(){
		setBank(BANK_2);
	});
}
initNoiseButtons = function() {
	document.querySelector('#noiseToggle').addEventListener('click', function(){
		noiseEnabled = !noiseEnabled;
		seqCont.setNoise(noiseEnabled);
		if ( noiseEnabled ) {
			this.classList.add('btn-warning');
		} else {
			this.classList.remove('btn-warning');
		}
	});

	var pot = new potentiometer('noiseColorKnob',{
		value: 0,
		min: 0,
		max: 11,
		height: '32px',
		width: '32px',
		rotate : function(ratio){
			var theVal = ratio * 11;
			var theDataVal = ratio*500;
			document.querySelector('#noiseColorValue').innerText = theVal.toFixed(1);
			seqCont.setNoiseColor(theDataVal.toFixed(0));
		}
	});
	pot.render();
}
initModeButtons = function() {
	document.querySelector('#arpModeSelector').addEventListener('click', function(){
		setMode(MODE_ARP);
	});
	document.querySelector('#seqModeSelector').addEventListener('click', function(){
		setMode(MODE_SEQ);
	});
}
initSampleHoldButtons = function() {
	document.querySelector('#sampHoldNormalSelector').addEventListener('click', function(){
		setSHMode(SHMODE_NORMAL);
	});
	document.querySelector('#sampHoldFollowSelector').addEventListener('click', function(){
		setSHMode(SHMODE_FOLLOW);
	});
}
initGateSlider = function() {
	var slider = document.querySelector('#gateWidthSlider');
	noUiSlider.create(slider, {
		start: 50,
		orientation: "horizontal",
		direction: 'ltr',
		range: {
			'min': 5,
			'max': 95
		}
	});
	slider.noUiSlider.on('slide', handleGateSlider);
}

// initialize/create the ouput sliders and buttons
initOutputSlider = function(){
	var slider = document.querySelector('#outputSlider');
	noUiSlider.create(slider, {
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
	slider.noUiSlider.on('slide', handleOutputSlider);
}

initMasterSection = function() {
	// seq/arp mode selector buttons
	initModeButtons();
	updateSelectedMode();
	// speed controls
	initSpeedButtons();
	initSpeedSlider();
	updateSpeedButtons();
	// bank selector buttons
	initBankButtons();
	updateBankButtons();
	// noise selector buttons/faders
	initNoiseButtons();
	initGateSlider();
	// sample/hold mode (normal/follow)
	initSampleHoldButtons();
	updateSelectedSHMode();
	// master transport
	initTransportButtons();
	updateTransportButtons();

	// output voltage and bank control
	// initOutputSlider();
}

initStep = function(parentSel, step) {
	var stepObj = new sequencerStep( { idpref: 'step_', parentSelector: parentSel, stepIndex : step.idx, val: step.val, enabled: step.enabled, reset: resets[step.idx] } );
	stepObj.init();
	stepObj.addHandlers(handleStepToggle, handleStepSlider, handleStepReset);
	if ( currentStep == step.idx ) {
		stepObj.setCurrent();
	}
	stepUIObjects[stepUIObjects.length] = stepObj;
}
initSteps = function() {
	// starndard sequencer steps
	var steps = ( selectedBank == BANK_1 ) ? stepsBank1 : stepsBank2;
	for ( var i=0; i<numberOfSteps; i++) {
		initStep( (i < (numberOfSteps/2)) ? '#sequenceRow1' : '#sequenceRow2', steps[i] );
	}
	// arpeggiator steps - Analog output 1 can be either bank1 or arpeggiator
	for ( var i=0; i<numberOfSteps; i++) {
		initArpStep( (i < (numberOfSteps/2)) ? '#arpRow1' : '#arpRow2', arpSteps[i] );
	}
	updateStepValues();
	updateStepDisplay();
}
initArpStep = function(parentSel, step) {
	var stepObj = new arpStep( { idpref: 'arpstep_', parentSelector: parentSel, stepIndex : step.idx, val: step.val, enabled: step.enabled, reset: resets[step.idx] } );
	stepObj.init();
	stepObj.addHandlers(handleArpStepToggle, handleArpStepSlider, handleStepReset);
	if ( currentStep == step.idx ) {
		stepObj.setCurrent();
	}
	arpStepUIObjects[arpStepUIObjects.length] = stepObj;
}

initConsole = function() {
	// console send button
	document.querySelector('#seqConsoleSend').addEventListener('click', function(){
		var req = document.querySelector('#seqConsoleRequest').value;
		seqCont.sendRawData(req + '\n');
		document.querySelector('#seqConsoleRequest').value = '';
	});
	document.querySelector('#seqConsoleClear').addEventListener('click', function(){
		document.querySelector('#seqConsoleResponse').innerHTML = null;
	});
	document.querySelector('#seqConsoleClose').addEventListener('click', function(){
		document.querySelector('#seqConsoleCont').style.display = 'none';
	});
	document.querySelector('#seqConsoleList').addEventListener('click', function(){
		seqCont.list();
	});
	document.querySelector('#seqConsoleDump').addEventListener('click', function(){
		seqCont.dump();
	});
	document.querySelector('#seqConsoleReconnect').addEventListener('click', function(){
		var dev = document.querySelector('#seqConsoleRequest').value;
		if ( dev != null && dev.indexOf('/dev') == 0 ) {
			console.log("Attempting to reconnect to: " + dev);			
		} else {
			// TODO show invalid device warning in UI
			console.log("Bad/Missing device, please specify a device to connect to of the form /dev/xxx");
		}
	});
	// console launcher
	document.querySelector('#sequencerVersion').addEventListener('dblclick', function(){
		document.querySelector('#seqConsoleCont').style.display = 'flex';
	});
}

document.addEventListener("DOMContentLoaded", function(event) { 

	window.addEventListener('keydown', function(e) {
		if(e.keyCode == 32) {
			var tag = e.target.tagName;
			if ( tag != "INPUT" && tag != "TEXTAREA" ) {
				if (sequencerState == STATE_PLAYING || sequencerState == STATE_PAUSED) {
					seqStop();
				} else if (sequencerState == STATE_PAUSED || sequencerState == STATE_STOPPED) {
					seqStart();
				}
				e.preventDefault();
			}
		} else if ( e.keyCode == 40 ) {
			if (sequencerState == STATE_PLAYING) {
				seqPause();
			}
		} else if ( e.keyCode == 39 ) {
			if (sequencerState == STATE_PAUSED) {
				seqNext();
			}
		} else if ( e.keyCode == 37 ) {
			if (sequencerState == STATE_PAUSED) {
				seqPrev();
			}
		}
	});

	initSteps();
	initMasterSection();
	initConsole();

	// testing out some container stuff
	window.setTimeout(function() {
		if ( !seqCont.hasContainer() ) {
			window.__registerContainer('fake');
		}
	}, 5000);

});


