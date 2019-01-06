//
//  VoltMeter.cpp
//
//
//  Created by BSchwinn on 1/9/17.
//
//

#include "VoltMeter.h"

VoltMeter::VoltMeter(void (*callback)(float)) {
    onUpdate = callback;
    
    // internal constants, these can be refined based on
    // real world values for better precision
    _vref = 5.0;
    _R1 = 100000;
    _R2 = 10000;
}

// set us up
void VoltMeter::begin(int meterPin, int refreshTime, int sampleTime) {
    _meterPin = meterPin;
    _displayUpdateTime = refreshTime; // in ms
    _sampleTime = sampleTime; // in micros
}

// do the updating
void VoltMeter::update(unsigned long currMicros, unsigned long currMillis) {
    if ((currMicros - _lastSample) > _sampleTime) {
        _lastSample = currMicros;
        this->_sampleVoltage(currMillis);
    }
}

// take a sample reading and call the update callback
void VoltMeter::_sampleVoltage(unsigned long currMillis) {
    int val = analogRead(_meterPin);
    float volts = (val / 1023.0) * _vref;
    float volts2 = volts / (_R2 / (_R1 + _R2)); // scale up

    // TODO track min/max

    if ((currMillis - _lastDisplayUpdate) > _displayUpdateTime) {
        _lastDisplayUpdate = currMillis;
        onUpdate(volts2);
    }
}