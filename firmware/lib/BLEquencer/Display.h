//
//  Display.h
//
//
//  Created by BSchwinn on 1/9/17.
//
//

#ifndef Display_h
#define Display_h

#include "Arduino.h"
#include <Adafruit_RGBLCDShield.h>

// These #defines make it easy to set the backlight color
#define RED 0x1
#define YELLOW 0x3
#define GREEN 0x2
#define TEAL 0x6
#define BLUE 0x4
#define VIOLET 0x5
#define WHITE 0x7

class Display {
    
    
public:
    Display(int);
    
    void begin(bool, int, float, int);
    void update(unsigned long currMicros, unsigned long currMillis);
    
    void setSpeed(float);
    void setVoltage(float);
    void setArpMode(bool);
    void setEffectsAlgo(int);
    void setGateWidth(int);
    
private:
    Adafruit_RGBLCDShield _lcd;
    
    bool _splashing;
    int _splashTime;
    unsigned int _startTime;
    
    bool _arpMode;
    int _effectsAlgo;
    float _speed;
    int _gateWidth;
    
    void _splashDisplay();
    void _initDisplay();
};

#endif /* Display_h */
