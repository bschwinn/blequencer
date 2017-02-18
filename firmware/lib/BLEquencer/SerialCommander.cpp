//
//  SerialCommander.cpp
//  
//
//  Created by BSchwinn on 1/9/17.
//
//

#include "SerialCommander.h"

// TODO protocol - should we use a single byte for the command?

SerialCommander::SerialCommander(void (*callback)(int, const int[ARG_LENGTH]), void (*errcallback)(const char[CMD_LENGTH+1], const char[LINE_LENGTH-CMD_LENGTH-1])) {
    onCommand = callback;
    onCommandError = errcallback;
}

void SerialCommander::begin(uint16_t baud) {
    _baud = baud;
}

void SerialCommander::update() {
    static byte ndx = 0;
    char theChar;
    
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

void SerialCommander::parseSerialLine() {
    char cmd[CMD_LENGTH+1]; // char buffer for command
    char args[LINE_LENGTH-CMD_LENGTH-1]; // char buffer for data
    int argsLen = 0;
    for (int i = 0; i < strlen(_rcvdChars); i++ ) {
        if ( i < CMD_LENGTH ) {
            cmd[i] = _rcvdChars[i];
        } else {
            args[i-CMD_LENGTH] = _rcvdChars[i];
            argsLen++;
        }
    }
    cmd[5] = '\0';
    args[argsLen] = '\0';
    this->parseSerialCommand(cmd, args);
}

// The main command parsing routine, parses serial commands like these:
// ex: step change command sets _notes2[15] = 2048 (enabled)
// note 1,15,2048,1
// ex: step change command sets _notes[11] = 4095 (disabled)
// note 0,11,4095,0
// ex: reset at step 5 on
// stpre5,1
// ex: reset at step 5 off
// stpre5,0
// ex: set bpm to 88.9
// bpm  889
void SerialCommander::parseSerialCommand(const char cmd[CMD_LENGTH+1], const char args[LINE_LENGTH-CMD_LENGTH+1]) {
    // parse command
    int serCmd;
    if ( strcmp(cmd, "bpm  ") == 0 ) {
        serCmd = CMD_BPM;
    } else if ( strcmp(cmd, "note ") == 0 ) {
        serCmd = CMD_NOTE;
    } else if ( strcmp(cmd, "play ") == 0 ) {
        serCmd = CMD_PLAY;
    } else if ( strcmp(cmd, "pause") == 0 ) {
        serCmd = CMD_PAUSE;
    } else if ( strcmp(cmd, "stop ") == 0 ) {
        serCmd = CMD_STOP;
    } else if ( strcmp(cmd, "reset") == 0 ) {
        serCmd = CMD_RESET;
    } else if ( strcmp(cmd, "next ") == 0 ) {
        serCmd = CMD_NEXT;
    } else if ( strcmp(cmd, "prev ") == 0 ) {
        serCmd = CMD_PREV;
    } else if ( strcmp(cmd, "noise") == 0 ) {
        serCmd = CMD_NOISE;
    } else if ( strcmp(cmd, "nzcol") == 0 ) {
        serCmd = CMD_NZCOL;
    } else if ( strcmp(cmd, "mode ") == 0 ) {
        serCmd = CMD_MODE;
    } else if ( strcmp(cmd, "gate ") == 0 ) {
        serCmd = CMD_GATE;
    } else if ( strcmp(cmd, "shmo ") == 0 ) {
        serCmd = CMD_SHMOD;
    } else {
        Serial.print("SerialCommander error - cmd: ");
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
    onCommand(serCmd,serArgs);
}

void SerialCommander::sendSpeedUpdate(int bpm) {
    Serial.print("bpm  ");
    Serial.println(bpm);
}

void SerialCommander::sendStepUpdate(int step) {
    Serial.print("step ");
    Serial.println(step);
}


