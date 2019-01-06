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
#include <Envelope.h>


/* BLE Sequencer */

#define MAX_STEPS 16
// revisit this number, very close to 4096/(5volts * 12 chomatic notes)
#define SEMI_TONE 67 // at 12 bit (4096)

#define STATUS_RUNNING 0
#define STATUS_PAUSED 1
#define STATUS_STOPPED 2

#define FXALGO_SAMPLEHOLD 0
#define FXALGO_FOLLOWFREEZE 1
#define FXALGO_QUANT_CHROM 2


class BLEquencer {

public:
    BLEquencer(void (*callback)(int, int, int));

    void begin(int, int, int, int, int, int, int, int, int);

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
    void  setEffectsAlgo(int);
    bool  getArpMode();
    bool  getEffectsAlgo();
    bool  getNoise();
    int   getNoiseColor();
    float getSpeed();
    int   getGateWidth();
    int   getStepNote(int, int);
    bool  getStepReset(int);
    void  setAttackRate(int output, float rate);
    void  setDecayRate(int output, float rate);
    void  setReleaseRate(int output, float rate);
	void  setSustainLevel(int output, float level);

    // called each scan
    void update(unsigned long currMicros, unsigned long currMillis);

    // callback for each beat of the sequencer
    void (*onBeat)(int, int, int);
    
private:

    static const int TRIGGER_DURATION  = 10; // in micro seconds
    static const int ENV_SAMPLE_PERIOD = 250; // in micro seconds

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

    // ASSR envelopes
    Envelope env1;
    Envelope env2;

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
    
    // sample and hold and quantizer
    int _sampHoldIn;
    int _sampHoldOut;
    int _sampHoldTrig;
    bool _lastSampHoldTrig;
    int _effectsAlgo;
    unsigned long _prevEnvSample;

    // internals
    int _getFirstReset();
    void _playStep(int);
    void _updateDACs(int);
    void _gateHigh();
    void _gateLow();
    void _triggerHigh();
    void _triggerLow();
    void _makeNoise(unsigned long);
    void _sampleHold();
    void _quantize();
};

#endif /* BLEquencer_h */
