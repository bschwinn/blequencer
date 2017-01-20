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


/* BLE Sequencer */

#define MAX_STEPS 16

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
    BLEquencer(const int[MAX_STEPS], const int[MAX_STEPS], const bool[MAX_STEPS], void (*callback)(int, int, int));

    void init(int, int, int);

    // control functions
    void play();
    void pause();
    void stop();
    void reset();
    void next();
    void prev();
    void setSpeed(float bpm);
    void setNote(int out, int step, int val, bool disabled);
    void setEnabled(int step, bool enabled);
    void setReset(int step, bool reset);
    void setNoise(bool onoff);
    void setNoiseColor(int color);
    bool getNoise();
    int  getNoiseColor();

    // called each scan
    void update();

    // callback for each beat of the sequencer
    void (*onBeat)(int, int, int);
    
private:

    static const int TRIGGER_DURATION  = 10; // in micro seconds

    int   _notes[MAX_STEPS];
    int   _notes2[MAX_STEPS];
    bool  _resets[MAX_STEPS];
    bool  _running;
    float _bpm;
    int   _step;

    unsigned long _prevNote;
    unsigned long _prevTrigger;
    unsigned long _prevNoise;

    bool _noiseEnabled;
    int  _noiseColor;
    int  _noisePin;
    unsigned long int _noiseSeed;
    unsigned long int newseed;
    unsigned char lobit;
    unsigned char b31, b29, b25, b24;
    
    int  _gatePin;
    int  _triggerPin;
    bool _triggered;

    int getFirstReset();
    void playStep(int);
};

#endif /* BLEquencer_h */
