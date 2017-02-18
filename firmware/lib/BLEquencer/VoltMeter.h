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
    void begin(int, int);
    void update();
    
private:
    int _meterPin;
    int _updateTime;
    int _lastUpdate;
    
    float _vref;
    int _R1;
    int _R2;
    
    void _sampleVoltage();
    
    void (*onUpdate)(float);

};

#endif /* VoltMeter_h */
