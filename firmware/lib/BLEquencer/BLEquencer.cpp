//
//  BLEquencer.cpp
//  
//
//  Created by BSchwinn on 1/9/17.
//
//

#include "BLEquencer.h"

/* BLE Sequencer */

BLEquencer::BLEquencer(const int vals1[MAX_STEPS], const int vals2[MAX_STEPS], const bool resets[MAX_STEPS], void (*callback)(int, int, int)) {
    // defauls/initialization
    _running = false;
    _bpm = 60;
    _noiseEnabled = false;
    _noiseSeed = 0x55aa55aaL;
    _noiseColor = 250;
    _prevNoise = 0;
    _triggered = false;
    _prevTrigger = 0;

    // copy array args into member vars
    memcpy(_notes, vals1, MAX_STEPS*sizeof(int));
    memcpy(_notes2, vals2, MAX_STEPS*sizeof(int));
    memcpy(_resets, resets, MAX_STEPS*sizeof(bool));
    
    // the "beat" callback
    onBeat = callback;
    
    _step = this->getFirstReset();
}

void BLEquencer::init(int noisePin, int gatePin, int triggerPin) {
    _noisePin = noisePin;
    _gatePin = gatePin;
    _triggerPin = triggerPin;
    pinMode(_noisePin, OUTPUT);
    pinMode(_gatePin, OUTPUT);
    pinMode(_triggerPin, OUTPUT);
}

/* control functions */

void BLEquencer::play() {
    _running = true;
}

void BLEquencer::pause() {
    _running = false;
}

void BLEquencer::stop() {
    _running = false;
    _step = this->getFirstReset();
    _prevNote = 0;
    // generate a beat event (but don't play)
    // fake being on first step when we're really on the last
    onBeat(0, _notes[0], _notes2[0]);
}

void BLEquencer::reset() {
    this->stop();
    this->play();
}

void BLEquencer::next() {
    if ( (_resets[_step]) || (_step >= MAX_STEPS) ) {
        _step = 0;
    } else {
        _step++;
    }
    this->playStep(_step);
}

void BLEquencer::prev() {
    if ( _step == 0 ) {
        _step = this->getFirstReset();
    } else {
        _step--;
    }
    this->playStep(_step);
}

void BLEquencer::setSpeed(float bpm) {
    _bpm = bpm;
}

void BLEquencer::setNote(int output, int step, int val, bool enabled) {
    int theVal = val;
    // cheap way to disable
    if ( !enabled) {
        theVal = -1;
    }
    if ( step < MAX_STEPS ) {
        if ( output == 0 ) {
            _notes[step] = theVal;
        } else if ( output == 1 ) {
            _notes2[step] = theVal;
        }
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

int BLEquencer::getNoiseColor() {
    return _noiseColor;
}

// TODO - deal with micro second roll-over??!!?  70 minutes is quite some time, but the trigger/gate would be stuck
void BLEquencer::update() {
    // take timer snaps shots
    unsigned long currMillis = millis();
    unsigned long currMicros = micros();
    
    // sequencer note timing
    if ( _running ) {
        float beat = 1/_bpm*60000; // BPM to milliseconds
        if((currMillis - _prevNote) > beat) {
            _prevNote = currMillis;
            this->next();
        }
    }
    
    // trigger duration timing
    if (_triggered && (_prevTrigger > TRIGGER_DURATION )) {
        digitalWrite (_triggerPin, 0);
        _triggered = false;
    }
    
    // noise bit shifting and updating
    if ( _noiseEnabled ) {
        if((currMicros - _prevNoise) > _noiseColor) {
            b31 = (_noiseSeed & (1L << 31)) >> 31;
            b29 = (_noiseSeed & (1L << 29)) >> 29;
            b25 = (_noiseSeed & (1L << 25)) >> 25;
            b24 = (_noiseSeed & (1L << 24)) >> 24;
            lobit = b31 ^ b29 ^ b25 ^ b24;
            newseed = (_noiseSeed << 1) | lobit;
            _noiseSeed = newseed;
            digitalWrite (_noisePin, _noiseSeed & 1);
            _prevNoise = currMicros;
        }
    }
}


/* internal functions */

int BLEquencer::getFirstReset() {
    for (int i=0; i<MAX_STEPS; i++ ) {
        if ( _resets[i] == true ) {
            return i;
        }
    }
    return MAX_STEPS-1;
}

void BLEquencer::playStep(int step) {
    // always trigger since this is a clock pulse for the sequencer
    digitalWrite (_triggerPin, 1);
    _triggered = true;
    _prevTrigger = micros();
    // gate is another matter, if step is disabled, no gate
    if ( _notes[step] > 0 ) {
        // generate gate signal
        // TODO should enables be bank-independent like resets?
    }
    // always generate a beat "event" so the DACs can be zero'ed
    onBeat(step, _notes[step], _notes2[step]);
}
