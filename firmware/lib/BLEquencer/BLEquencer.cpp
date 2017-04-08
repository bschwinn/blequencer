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
    _noiseEnabled = false;
    _noiseSeed = 0x55aa55aaL;
    _noiseColor = 250;
    _prevNoise = 0;
    _arpEnabled = false;
    _triggerOn = false;
    _prevTrigger = 0;
    _gateOn = false;
    _prevGate = 0;
    _gateWidth = 75;
    _sampHoldFollow = false;
    
    _notes[0] = tonic;
    _notes[1] = major3rd;
    _notes[2] = fifth;
    _notes[3] = major7th;
    _notes[4] = octave;
    _notes[5] = major7th;
    _notes[6] = fifth;
    _notes[7] = major3rd;
    _notes[8] = tonic;
    _notes[9] = major3rd;
    _notes[10] = fifth;
    _notes[11] = octave;
    _notes[12] = tonic;
    _notes[13] = major3rd;
    _notes[14] = fifth;
    _notes[15] = octave;
    
    _notes2[0] = 511;
    _notes2[1] = 1023;
    _notes2[2] = 1535;
    _notes2[3] = 2047;
    _notes2[4] = 2559;
    _notes2[5] = 3071;
    _notes2[6] = 3583;
    _notes2[7] = 4071;
    _notes2[8] = 3583;
    _notes2[9] = 3071;
    _notes2[10] = 2559;
    _notes2[11] = 2047;
    _notes2[12] = 1535;
    _notes2[13] = 1023;
    _notes2[14] = 511;
    _notes2[15] = 128;
    
    _resets[15] = true;
        
    // the "beat" callback
    onBeat = callback;
    
    _step = this->_getFirstReset();
}

void BLEquencer::begin(int noisePin, int gatePin, int triggerPin, int inputGatePin, int sampHoldIn, int sampHoldOut, int sampHoldClk) {

    // our 12 bit DACs for main CVs
    _dac1.begin(0x62);
    _dac2.begin(0x63);
    // pin assignments and modes
    _noisePin = noisePin;
    _gatePin = gatePin;
    _triggerPin = triggerPin;
    _inputGatePin = inputGatePin;
    _sampHoldIn = sampHoldIn;
    _sampHoldOut = sampHoldOut;
    _sampHoldClk = sampHoldClk;
    pinMode(_noisePin, OUTPUT);
    pinMode(_gatePin, OUTPUT);
    pinMode(_triggerPin, OUTPUT);
    pinMode(_inputGatePin, INPUT);
    pinMode(_sampHoldOut, OUTPUT); // 8 bit PWM output
    pinMode(_sampHoldClk, INPUT);
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

void BLEquencer::setNoise(bool onoff) {
    _noiseEnabled = onoff;
}

void BLEquencer::setNoiseColor(int color) {
    _noiseColor = color;
}

bool BLEquencer::getNoise() {
    return _noiseEnabled;
}

float BLEquencer::getSpeed() {
    return _bpm;
}

int BLEquencer::getNoiseColor() {
    return _noiseColor;
}

void BLEquencer::setArpMode(bool onoff) {
    _arpEnabled = onoff;
}

void BLEquencer::setGateWidth(int pwidth) {
    _gateWidth = pwidth;
    if (_gateWidth > 95) {
        _gateWidth = 95;
    } else if (_gateWidth < 5) {
        _gateWidth = 5;
    }
}

void BLEquencer::setSampleHoldMode(bool follow) {
    _sampHoldFollow = follow;
}

bool BLEquencer::getArpMode() {
    return _arpEnabled;
}
bool BLEquencer::getSampleHoldMode() {
    return _sampHoldFollow;
}

int BLEquencer::getGateWidth() {
    return _gateWidth;
}

// TODO - deal with micro second roll-over??!!?  70 minutes is quite some time, but the trigger/gate would be stuck
void BLEquencer::update() {
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
    unsigned long currMillis = millis();
    unsigned long currMicros = micros();
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
    }
    
    // noise updating
    if ( _noiseEnabled ) {
        if((currMicros - _prevNoise) > _noiseColor) {
            this->_makeNoise();
        }
    }
    
    // sample and hold w/ follow mode
    int smpClk = digitalRead(_sampHoldClk);
    if ( _sampHoldFollow ) {
        // input follows output until click goes high (and output freezes)
        if (smpClk==0) {
            // copy S/H input to S/H output
            this->_sampleHold();
        }
    } else {
        // standard sample/hold, snapshot on rising edge of clock pulse
        if (smpClk != _lastSampHoldClk) {
            if ( smpClk == HIGH ) {
                this->_sampleHold();
            }
        }
    }
    _lastSampHoldClk = smpClk;
}


/* internal functions */

// generate and write the bit noise
void BLEquencer::_makeNoise() {
    b31 = (_noiseSeed & (1L << 31)) >> 31;
    b29 = (_noiseSeed & (1L << 29)) >> 29;
    b25 = (_noiseSeed & (1L << 25)) >> 25;
    b24 = (_noiseSeed & (1L << 24)) >> 24;
    lobit = b31 ^ b29 ^ b25 ^ b24;
    newseed = (_noiseSeed << 1) | lobit;
    _noiseSeed = newseed;
    digitalWrite (_noisePin, _noiseSeed & 1);
    _prevNoise = micros();
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

// copy S/H input to S/H output
void BLEquencer::_sampleHold() {
    // read alalog in
    int shin = analogRead(_sampHoldIn);
    // scale 10 bit to 8 bit
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
        _prevGate = micros();
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
