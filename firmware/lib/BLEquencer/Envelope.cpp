//
//  BLEquencer.cpp
//  
//
//  Created by BSchwinn on 1/9/17.
//
//  Heavy Inspiration on the ADSR envs from: 
//  http://www.earlevel.com/main/2013/06/03/envelope-generators-adsr-code/
//  Started implementing them as simple linear but realized that's not great
//

#include "Envelope.h"

Envelope::Envelope(void) {
    _state = STATE_IDLE;
    _prevGate = false;
    _envStart = 0;
    _envEnd = 0;
    this->setAttackRate(0);
    this->setDecayRate(0);
    this->setReleaseRate(0);
    this->setSustainLevel(1.0);
    this->setTargetRatioA(0.3);
    this->setTargetRatioDR(0.0001);
}

void Envelope::begin(int outPin) {
    _outputPin = outPin;
    pinMode(_outputPin, OUTPUT); // 8 bit PWM output
}

void Envelope::update(unsigned long currMicros, unsigned long currMillis, bool gateOnOff) {

    // TODO implement sample rate of 4k/s

    // if gate goes high, immediately go into attack state
    if (gateOnOff && !_prevGate) {
        _state = STATE_ATTACK;
    }

    // if gate goes low, immediately go into release state
    if (!gateOnOff && _prevGate) {
        _state = STATE_RELEASE;
    }

    // Attack
    if (_state == STATE_ATTACK) {
        _output = _attackBase + (_output * _attackCoef);
        if (_output >= 1.0) {
            _output = 1.0;
            _state = STATE_DECAY;
        } else {
            this->setLevel(_output);
        }
    }

    // Decay
    if (_state == STATE_DECAY) {
        _output = _decayBase + (_output * _decayCoef);
        if (_output <= _sustainLevel) {
            _output = _sustainLevel;
            _state = STATE_SUSTAIN;
        }
        this->setLevel(_output);
    }

    // Sustain
    if (_state == STATE_SUSTAIN) {
        // noop, last voltage/output is simply held
    }

    // Release
    if (_state == STATE_RELEASE) {
        _output = _releaseBase + _output * _releaseCoef;
        if (_output <= 0.0) {
            _output = 0.0;
            _state = STATE_IDLE;
        }
        this->setLevel(_output);
    }
}

void Envelope::setAttackRate(float rate) {
    _attackRate = rate;
    _attackCoef = this->calcCoef(rate, _targetRatioA);
    _attackBase = (1.0 + _targetRatioA) * (1.0 - _attackCoef);
}

void Envelope::setDecayRate(float rate) {
    _decayRate = rate;
    _decayCoef = this->calcCoef(rate, _targetRatioDR);
    _decayBase = (_sustainLevel - _targetRatioDR) * (1.0 - _decayCoef);
}

void Envelope::setSustainLevel(float level) {
    _sustainLevel = level;
    _decayBase = (_sustainLevel - _targetRatioDR) * (1.0 - _decayCoef);
}

void Envelope::setReleaseRate(float rate) {
    _releaseRate = rate;
    _releaseCoef = this->calcCoef(rate, _targetRatioDR);
    _releaseBase = -_targetRatioDR * (1.0 - _releaseCoef);
}

float Envelope::calcCoef(float rate, float targetRatio) {
    return (rate <= 0) ? 0.0 : exp(-log((1.0 + targetRatio) / targetRatio) / rate);
}

void Envelope::setTargetRatioA(float targetRatio) {
    if (targetRatio < 0.000000001)
        targetRatio = 0.000000001;  // -180 dB
    _targetRatioA = targetRatio;
    _attackCoef = calcCoef(_attackRate, _targetRatioA);
    _attackBase = (1.0 + _targetRatioA) * (1.0 - _attackCoef);
}

void Envelope::setTargetRatioDR(float targetRatio) {
    if (targetRatio < 0.000000001)
        targetRatio = 0.000000001;  // -180 dB
    _targetRatioDR = targetRatio;
    _decayCoef = calcCoef(_decayRate, _targetRatioDR);
    _releaseCoef = calcCoef(_releaseRate, _targetRatioDR);
    _decayBase = (_sustainLevel - _targetRatioDR) * (1.0 - _decayCoef);
    _releaseBase = -_targetRatioDR * (1.0 - _releaseCoef);
}

void Envelope::setLevel(float level) {
    int out = level * 255;
    analogWrite(_outputPin, out);
}