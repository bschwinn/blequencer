//
//  BLEquencer.h
//  
//
//  Created by BSchwinn on 1/9/17.
//
//

#ifndef BLEquencer_h
#define BLEquencer_h

#include <stdio.h>
#include "Arduino.h"
#include <Adafruit_MCP4725.h>


/* BLE Sequencer */

#define MAX_STEPS 16
#define SEMI_TONE 67

#define STATUS_RUNNING 0
#define STATUS_PAUSED 1
#define STATUS_STOPPED 2

#define tonic 0
#define minor2nd 67
#define major2nd 134
#define minor3rd 201
#define major3rd 268
#define fourth 335
#define tritone 402
#define fifth 469
#define minor6th 536
#define major6th 603
#define minor7th 670
#define major7th 737
#define octave 804
#define octave2 1608

class BLEquencer {

public:
    BLEquencer(void (*callback)(int, int, int));

    void begin(int, int, int, int, int, int, int);

    // control functions
    void  init();
    void  play();
    void  pause();
    void  stop();
    void  reset();
    void  next();
    void  prev();
    void  setSpeed(float bpm);
    void  setNote(int out, int step, int val);
    void  setStepReset(int step, bool reset);
    void  setStepEnabled(int step, bool enabled);
    void  setNoise(bool onoff);
    void  setNoiseColor(int color);
    void  setArpMode(bool onoff);
    void  setGateWidth(int pct);
    void  setSampleHoldMode(bool);
    bool  getArpMode();
    bool  getSampleHoldMode();
    bool  getNoise();
    int   getNoiseColor();
    float getSpeed();
    int   getGateWidth();

    // called each scan
    void update();

    // callback for each beat of the sequencer
    void (*onBeat)(int, int, int);
    
private:

    static const int TRIGGER_DURATION  = 10; // in micro seconds
    
    float _gateWidth;

    int   _notes[MAX_STEPS];
    int   _notes2[MAX_STEPS];
    bool  _resets[MAX_STEPS];
    
    int   _runStatus;
    bool  _arpEnabled;
    float _bpm;
    int   _step;
    unsigned long _prevNote;

    // main CV outs
    Adafruit_MCP4725 _dac1;
    Adafruit_MCP4725 _dac2;

    // input gate
    int _inputGatePin;
    int _lastInGate;
    
    // noise
    bool _noiseEnabled;
    int  _noiseColor;
    int  _noisePin;
    unsigned long _prevNoise;
    unsigned long int _noiseSeed;
    unsigned long int newseed;
    unsigned char lobit;
    unsigned char b31, b29, b25, b24;
    
    // output gate
    int  _gatePin;
    bool _gateOn;
    unsigned long _prevGate;
    
    // output trigger
    int  _triggerPin;
    bool _triggerOn;
    unsigned long _prevTrigger;
    
    // sample and hold
    int _sampHoldIn;
    int _sampHoldOut;
    int _sampHoldClk;
    bool _sampHoldFollow;
    int _lastSampHoldClk;

    // internals
    int _getFirstReset();
    void _playStep(int);
    void _updateDACs(int);
    void _gateHigh();
    void _gateLow();
    void _triggerHigh();
    void _triggerLow();
    void _makeNoise();
    void _sampleHold();
};

#endif /* BLEquencer_h */
