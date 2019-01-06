//
//  VoltMeter.h
//
//
//  Created by BSchwinn on 1/9/17.
//
//

#ifndef VoltMeter_h
#define VoltMeter_h

#include "Arduino.h"

class VoltMeter {

    
public:
    VoltMeter(void (*)(float));
    
    // called each scan
    void begin(int, int, int);
    void update(unsigned long, unsigned long);
    
private:
    int _meterPin;
    int _sampleTime;
    int _lastSample;
    int _displayUpdateTime; // in ms
    int _lastDisplayUpdate;
    
    float _vref;
    int _R1;
    int _R2;
    
    void _sampleVoltage(unsigned long);
    
    void (*onUpdate)(float);

};

#endif /* VoltMeter_h */
