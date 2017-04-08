//
//  SerialCommander.cpp
//  
//
//  Created by BSchwinn on 1/9/17.
//
//

#include "SerialCommander.h"

// TODO protocol - should we use a single byte for the command?

SerialCommander::SerialCommander(void (*callback)(int, const int[ARG_LENGTH]), void (*errcallback)(int, const char[LINE_LENGTH-1])) {
    onCommand = callback;
    onCommandError = errcallback;
}

void SerialCommander::begin(uint16_t baud) {
    _baud = baud;
}

void SerialCommander::update() {
    static byte ndx = 0;
    char theChar;

//    this->checkBuffer();
    
    // TODO time box the while with millis()
    bool lineFound = false;
    while (Serial.available() > 0 && lineFound == false) {
        theChar = Serial.read();
        
        if (theChar != LINE_END) {
            _rcvdChars[ndx] = theChar;
            ndx++;
            
            // TODO handle overrun of _rcvdChars better
            if (ndx >= LINE_LENGTH) {
                ndx = LINE_LENGTH - 1;
                Serial.print("SerialCommanderError(overrun) data: ");
                Serial.println(_rcvdChars);
            }
        } else {
            _rcvdChars[ndx] = '\0';
            ndx = 0;
            lineFound = true;
        }
    }
    if (lineFound) {
        this->parseSerialLine();
    }
}
                
void SerialCommander::checkBuffer() {
    if (!_throttling && (Serial.available() > 48) ) {
        Serial.write(0x13); // xoff
        _throttling = true;
    } else if( _throttling && (Serial.available() < 32) ) {
        Serial.write(0x11); // Xon
        _throttling = false;
    }
}


void SerialCommander::parseSerialLine() {
    char args[LINE_LENGTH-1]; // char buffer for data
    int argsLen = 0;
    int cmd = 0;
    for (int i = 0; i < strlen(_rcvdChars); i++ ) {
        if ( i == 0 ) {
            cmd = _rcvdChars[i]-48;  // this is crap but we're packing the protocol
        } else {
            args[i-1] = _rcvdChars[i];
            argsLen++;
        }
    }
    args[argsLen] = '\0';
    this->parseSerialCommand(cmd, args);
}

void SerialCommander::parseSerialCommand(int cmd, const char args[LINE_LENGTH-1]) {
    if ( cmd < CMD_BPM || cmd > CMD_SHMOD ) {
        Serial.print("SerialCommanderError(unknown) cmd: ");
        Serial.print(cmd);
        Serial.print(", data: ");
        Serial.println(args);
        onCommandError(cmd, args);
        return;
    }

    // parse args into an array of ints
    int  serArgs[ARG_LENGTH];
    char * pch;
    int argIdx = 0;
    pch = strtok (args, ",");
    serArgs[argIdx] = atoi(pch);
    argIdx++;
    while (pch != NULL) {
        pch = strtok (NULL, ",");
        if ( argIdx < ARG_LENGTH ) {
            serArgs[argIdx] = atoi(pch);
            argIdx++;
        }
    }

    // publish command event with parsed command/args
    onCommand(cmd,serArgs);
}

void SerialCommander::sendSpeedUpdate(int bpm) {
    Serial.print("bpm  ");
    Serial.println(bpm);
}

void SerialCommander::sendStepUpdate(int step, int v1, int v2) {
    Serial.print("step ");
    Serial.print(step);
    Serial.print(',');
    Serial.print(v1);
    Serial.print(',');
    Serial.println(v2);
}

void SerialCommander::sendNoteUpdate(int step, int val) {
    Serial.print("note ");
    Serial.print(step);
    Serial.print(',');
    Serial.println(val);
}

