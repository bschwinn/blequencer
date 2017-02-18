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
void Display::begin() {
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
    _lcd.setCursor(0,0);
    _lcd.print("MOD ");
    _lcd.setCursor(8,0);
    _lcd.print("BPM ");
    _lcd.setCursor(0,1);
    _lcd.print("VOLT ");
}

void Display::setMode(char *mod) {
    _lcd.setCursor(5,0);
    _lcd.print(mod);
}

void Display::setSpeed(int spd) {
    _lcd.setCursor(12,0);
    _lcd.print(spd);
}

void Display::setVoltage(int volts) {
    _lcd.setCursor(6,1);
    _lcd.print(volts);
}

