//
//  BLEquencer.h
//  
//
//  Created by BSchwinn on 1/9/17.
//
//

#ifndef Envelope_h
#define Envelope_h

#include "Arduino.h"

#define STATE_IDLE 0
#define STATE_ATTACK 1
#define STATE_DECAY 2
#define STATE_SUSTAIN 3
#define STATE_RELEASE 4

class Envelope {

public:
    Envelope(void);
    void begin(int);
    void update(unsigned long, unsigned long, bool);
    void setAttackRate(float rate);
    void setDecayRate(float rate);
    void setReleaseRate(float rate);
	void setSustainLevel(float level);
    void setTargetRatioA(float targetRatio);
    void setTargetRatioDR(float targetRatio);

private:
    int _outputPin;
    int _output;
    int _samplePeriod;

    int _state;
    bool _prevGate;
    unsigned long _envStart;
    unsigned long _envEnd;

    int _sustainLevel;

	float _attackRate;
	float _decayRate;
	float _releaseRate;
	float _attackCoef;
	float _decayCoef;
	float _releaseCoef;
    float _targetRatioA;
    float _targetRatioDR;
    float _attackBase;
    float _decayBase;
    float _releaseBase;

    float calcCoef(float rate, float targetRatio);
    void setLevel(float);
};

#endif /* Envelope_h */
