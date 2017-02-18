//
//  Display.cpp
//
//
//  Created by BSchwinn on 1/9/17.
//
//

#include "Display.h"


Display::Display(int splash) {
    _splashTime = splash;
}

// set us up
void Display::begin(bool arpMode, bool shFollow, float spd, int gateWidth) {
    _arpMode = arpMode;
    _shFollowMode = shFollow;
    _speed = spd;
    _gateWidth = gateWidth;
    _lcd = Adafruit_RGBLCDShield();
    _lcd.begin(16,2);
    this->_splashDisplay();
}

// update internals
void Display::update() {
    if ( _splashing ) {
        if ( (millis() - _startTime) > _splashTime) {
            this->_initDisplay();
            _splashing = false;
        }
    }
}

void Display::_splashDisplay() {
    _splashing = true;
    _startTime = millis();
    _lcd.setCursor(0,0);
    _lcd.print("BLEquencer v1.0");
}

void Display::_initDisplay() {
    _lcd.clear();
    this->setArpMode(_arpMode);
    this->setSampleHoldMode(_shFollowMode);
    this->setSpeed(_speed);
    this->setGateWidth(_gateWidth);
}

void Display::setArpMode(bool arp) {
    _arpMode = arp;
    _lcd.setCursor(0,0);
    if ( arp ) {
        _lcd.print("ARP");
    } else {
        _lcd.print("SEQ");
    }
}

void Display::setSampleHoldMode(bool follow) {
    _shFollowMode = follow;
    _lcd.setCursor(5,0);
    if ( follow ) {
        _lcd.print("FOL");
    } else {
        _lcd.print("HLD");
    }
}

void Display::setSpeed(float spd) {
    _speed = spd;
    _lcd.setCursor(11,0);
    _lcd.print(spd);
}

void Display::setVoltage(float volts) {
    _lcd.setCursor(12,1);
    _lcd.print(volts);
}

void Display::setGateWidth(int gw) {
    _gateWidth = gw;
    if ( gw < 10 ) {
        _lcd.setCursor(0,1);
        _lcd.print(' ');
        _lcd.setCursor(1,1);
        _lcd.print(gw);
    } else {
        _lcd.setCursor(0,1);
        _lcd.print(gw);
    }
    _lcd.setCursor(2,1);
    _lcd.print('%');
}

