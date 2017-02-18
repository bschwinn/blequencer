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
void VoltMeter::begin(int meterPin, int updateTime) {
    _meterPin = meterPin;
    _updateTime = updateTime;
}

// do the updating
void VoltMeter::update() {
    unsigned long currMillis = millis();
    if ((currMillis - _lastUpdate) > _updateTime) {
        _lastUpdate = currMillis;
        this->_sampleVoltage();
    }
}

// take a sample reading and call the update callback
void VoltMeter::_sampleVoltage() {
    int val = analogRead(_meterPin);
    float ratio = (val * _vref) / 1024.0;
    float volts = ratio / (_R2 / (_R1 + _R2));
//    onUpdate(volts);
    onUpdate(1.0*val);
}