//
//  BLEquencer.cpp
//  
//
//  Created by BSchwinn on 1/9/17.
//
//

#include "BLEquencer.h"

/* BLE Sequencer */

BLEquencer::BLEquencer(void (*callback)(int, int, int)) {
    // defauls/initialization
    _runStatus = STATUS_STOPPED;
    _bpm = 60;
    _arpEnabled = false;
    // set step to last so "next" starts us at 0
    _step = MAX_STEPS-1;
    // set reset at last step
    _resets[MAX_STEPS-1] = true;
    // noise outputs, etc
    _noiseEnabled = false;
    _noiseSeed = 0x55aa55aaL;
    _noiseColor = 250;
    _prevNoise = 0;
    // trigger/gate outputs, etc
    _triggerOn = false;
    _prevTrigger = 0;
    _gateOn = false;
    _prevGate = 0;
    _gateWidth = 75;
    // "IO processor" mode (s/h and quantize, etc)
    _effectsAlgo = FXALGO_SAMPLEHOLD;
    // the "beat" callback
    onBeat = callback;
    // output envdelopes
    env1 = Envelope();
    env2 = Envelope();
    _prevEnvSample = 0;
}

void BLEquencer::begin(int gatePin, int triggerPin, int noisePin, int inputGatePin, int sampHoldIn, int sampHoldTrig, int sampHoldOut, int adsr1Out, int adsr2Out) {
    // 12 bit DACs for main CVs
    _dac1.begin(0x62);
    _dac2.begin(0x63);

    // output pin assignments
    _noisePin = noisePin;
    pinMode(_noisePin, OUTPUT);
    _gatePin = gatePin;
    pinMode(_gatePin, OUTPUT);
    _triggerPin = triggerPin;
    pinMode(_triggerPin, OUTPUT);
    _sampHoldOut = sampHoldOut;
    pinMode(_sampHoldOut, OUTPUT); // 8 bit PWM output

    // input pin assignments
    _inputGatePin = inputGatePin;
    pinMode(_inputGatePin, INPUT);
    _sampHoldTrig = sampHoldTrig;
    pinMode(_sampHoldTrig, INPUT);

    env1.begin(adsr1Out);
    env2.begin(adsr2Out);
}

/* control functions */

void BLEquencer::play() {
    _runStatus = STATUS_RUNNING;
}

void BLEquencer::pause() {
    _runStatus = STATUS_PAUSED;
}

void BLEquencer::stop() {
    _runStatus = STATUS_STOPPED;
    _step = this->_getFirstReset();
    _prevNote = 0;
    // generate a beat event (but don't play)
    // fake being on first step when we're really on the last
    onBeat(0, _notes[0], _notes2[0]);
    this->_gateLow();
}

void BLEquencer::reset() {
    this->stop();
    this->play();
}

void BLEquencer::next() {
    if ( (_resets[_step]) || (_step >= (MAX_STEPS-1)) ) {
        _step = 0;
    } else {
        _step++;
    }
    this->_playStep(_step);
}

void BLEquencer::prev() {
    if ( _step == 0 ) {
        _step = this->_getFirstReset();
    } else {
        _step--;
    }
    this->_playStep(_step);
}

void BLEquencer::setSpeed(float bpm) {
    _bpm = bpm;
}

void BLEquencer::setNote(int output, int step, int val) {
    if ( step < MAX_STEPS ) {
        if ( output == 1 ) {
            _notes[step] = val;
        } else if ( output == 2 ) {
            _notes2[step] = val;
        }
    }
    // update the DAC outputs if the sequencer is paused on this step
    if ( _runStatus == STATUS_PAUSED && step == _step ) {
        this->_updateDACs(step);
    }
}

void BLEquencer::setStepReset(int step, bool reset) {
    if ( step < MAX_STEPS ) {
        _resets[step] = reset;
    }
}

void BLEquencer::setStepEnabled(int step, bool enabled) {
    if ( step < MAX_STEPS ) {
        // TODO !!!!!!
    }
}

float BLEquencer::getSpeed() {
    return _bpm;
}

void BLEquencer::setArpMode(bool onoff) {
    _arpEnabled = onoff;
}

bool BLEquencer::getArpMode() {
    return _arpEnabled;
}

void BLEquencer::setNoise(bool onoff) {
    _noiseEnabled = onoff;
}

bool BLEquencer::getNoise() {
    return _noiseEnabled;
}

void BLEquencer::setNoiseColor(int color) {
    _noiseColor = color;
}

int BLEquencer::getNoiseColor() {
    return _noiseColor;
}

void BLEquencer::setGateWidth(int pwidth) {
    _gateWidth = pwidth;
    if (_gateWidth > 95) {
        _gateWidth = 95;
    } else if (_gateWidth < 5) {
        _gateWidth = 5;
    }
}

int BLEquencer::getGateWidth() {
    return _gateWidth;
}

void BLEquencer::setEffectsAlgo(int algo) {
    _effectsAlgo = algo;
}

bool BLEquencer::getEffectsAlgo() {
    return _effectsAlgo;
}

int BLEquencer::getStepNote(int step, int bank) {
    if ( step < MAX_STEPS ) {
        if ( bank == 1 ) {
            return _notes[step];
        } else if ( bank == 2 ) {
            return _notes2[step];
        }
    }
    return 0;
}

bool BLEquencer::getStepReset(int step) {
    if ( step < MAX_STEPS ) {
        return _resets[step];
    }
    return false;
}


// TODO - deal with micro second roll-over??!!?  70 minutes is quite some time, but the trigger/gate would be stuck
void BLEquencer::update(unsigned long currMicros, unsigned long currMillis) {
    // ARP MODE - scan/debounce input gate and start/stop accordingly
    if (_arpEnabled) {
        int inGate = digitalRead(_inputGatePin);
        if (inGate != _lastInGate) {
            if ( inGate == HIGH ) {
                this->play();
            } else {
                this->stop();
            }
        }
        _lastInGate = inGate;
    }
    
    // take timer snaps shots
    float beat = 1/_bpm*60000; // BPM to milliseconds
    
    // trigger reset timing
    if (_triggerOn && ((currMicros - _prevTrigger) > TRIGGER_DURATION )) {
        this->_triggerLow();
    }
    
    // sequencer note timing
    if ( _runStatus == STATUS_RUNNING ) {
        if ((currMillis - _prevNote) > beat) {
            _prevNote = currMillis;
            this->next();
        }
        if (_gateOn && ((currMillis - _prevNote) > (_gateWidth/100) * beat) ) {
            this->_gateLow();
        }

        if ( (currMicros - _prevEnvSample) > ENV_SAMPLE_PERIOD) {
            _prevEnvSample = currMicros;
            env1.update(currMicros, currMillis, _gateOn);
            env2.update(currMicros, currMillis, _gateOn);
        }
    }

    // noise updating
    if ( _noiseEnabled ) {
        if((currMicros - _prevNoise) > _noiseColor) {
            this->_makeNoise(currMicros);
        }
    }
    
    // FX processing
    // sample and hold w/ follow mode (triggered)
    // quantizer (with scales)
    int smpClk = digitalRead(_sampHoldTrig);
    if ( _effectsAlgo == FXALGO_FOLLOWFREEZE ) {
        // input follows output until click goes high (and output freezes)
        if (smpClk==0) {
            // copy S/H input to S/H output
            this->_sampleHold();
        }
    } else if ( _effectsAlgo == FXALGO_SAMPLEHOLD ) {
        // standard sample/hold, snapshot on rising edge of clock pulse
        if (smpClk && !_lastSampHoldTrig) {
            this->_sampleHold();
        }
    } else {
        if (_effectsAlgo == FXALGO_QUANT_CHROM) {

        }
    }
    _lastSampHoldTrig = smpClk;
}


/* internal functions */

// generate and write the bit noise
void BLEquencer::_makeNoise(unsigned long musec) {
    b31 = (_noiseSeed & (1L << 31)) >> 31;
    b29 = (_noiseSeed & (1L << 29)) >> 29;
    b25 = (_noiseSeed & (1L << 25)) >> 25;
    b24 = (_noiseSeed & (1L << 24)) >> 24;
    lobit = b31 ^ b29 ^ b25 ^ b24;
    newseed = (_noiseSeed << 1) | lobit;
    _noiseSeed = newseed;
    digitalWrite (_noisePin, _noiseSeed & 1);
    _prevNoise = musec;
}

// turn on the trigger and track the time
void BLEquencer::_triggerHigh() {
    digitalWrite (_triggerPin, 1);
    _triggerOn = true;
}

// turn off the trigger
void BLEquencer::_triggerLow() {
    digitalWrite (_triggerPin, 0);
    _triggerOn = false;
}

// turn on the gate and track the time
void BLEquencer::_gateHigh() {
    digitalWrite (_gatePin, 1);
    _gateOn = true;
}

// turn off the gate
void BLEquencer::_gateLow() {
    digitalWrite (_gatePin, 0);
    _gateOn = false;
}

// get the first of all the resets (from zero)
int BLEquencer::_getFirstReset() {
    for (int i=0; i<MAX_STEPS; i++ ) {
        if ( _resets[i] == true ) {
            return i;
        }
    }
    return MAX_STEPS-1;
}

// copy input to output
void BLEquencer::_sampleHold() {
    // read alalog in
    int shin = analogRead(_sampHoldIn);
    // scale 10 bit to 8 bit
    int shout = (shin/1024.0) * 255;
    // write analog out
    analogWrite(_sampHoldOut, shout);
}

// copy quantized input to output
void BLEquencer::_quantize() {
    // read alalog in
    int shin = analogRead(_sampHoldIn);
    // TODO quantize note based on algo
    int shout = (shin/1024.0) * 255;
    // write analog out
    analogWrite(_sampHoldOut, shout);
}

// play a step
void BLEquencer::_playStep(int step) {
    // always trigger since this is a clock pulse for the sequencer
    this->_triggerHigh();
    _prevTrigger = micros();
    // only generate a gate in sequencer mode
    if (!_arpEnabled) {
        this->_gateHigh();
        _prevGate = _prevTrigger;
    }
    // update the DAC outputs
    this->_updateDACs(step);
    
    // generate a beat "event"
    onBeat(step, _notes[step], _notes2[step]);
}

void BLEquencer::_updateDACs(int step) {
    // only generate a gate in sequencer mode
    if (!_arpEnabled) {
        _dac1.setVoltage(_notes[step], false);
    } else {
        // in arp mode, calculate the note modifier
        int modify = _notes[step]*SEMI_TONE;
        _dac1.setVoltage(modify, false);
    }
    _dac2.setVoltage(_notes2[step], false);
}

void BLEquencer::setAttackRate(int out, float rate) {
    if (out == 0) {
        env1.setAttackRate(rate);
    } else {
        env2.setAttackRate(rate);
    }
}

void BLEquencer::setDecayRate(int out, float rate) {
    if (out == 0) {
        env1.setDecayRate(rate);
    } else {
        env2.setDecayRate(rate);
    }
}

void BLEquencer::setSustainLevel(int out, float level) {
    if (out == 0) {
        env1.setSustainLevel(level);
    } else {
        env2.setSustainLevel(level);
    }
}

void BLEquencer::setReleaseRate(int out, float rate) {
    if (out == 0) {
        env1.setReleaseRate(rate);
    } else {
        env2.setReleaseRate(rate);
    }
}
