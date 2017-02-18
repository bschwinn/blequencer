//
//  SerialCommander.h
//  
//
//  Created by BSchwinn on 1/9/17.
//
//

#ifndef SerialCommander_h
#define SerialCommander_h

#include <stdio.h>
#include "Arduino.h"

class SerialCommander {

    static const int LINE_LENGTH = 32;
    static const int CMD_LENGTH = 5;
    static const int ARG_LENGTH = 5;
    static const char LINE_END = '\n';
    
    
public:
    SerialCommander(void (*callback)(int, const int[ARG_LENGTH]), void (*errcallback)(const char[CMD_LENGTH+1], const char[LINE_LENGTH-CMD_LENGTH-1]));
    
    // called each scan
    void begin(uint16_t);
    void update();
    void sendSpeedUpdate(int);
    void sendStepUpdate(int);

    static const int CMD_BPM   = 0;
    static const int CMD_PLAY  = 1;
    static const int CMD_PAUSE = 2;
    static const int CMD_STOP  = 3;
    static const int CMD_RESET = 4;
    static const int CMD_NEXT  = 5;
    static const int CMD_PREV  = 6;
    static const int CMD_NOTE  = 7;
    static const int CMD_NOISE = 8;
    static const int CMD_NZCOL = 9; // noise color
    static const int CMD_MODE = 10;
    static const int CMD_GATE = 11;

    static const int CMD_UNDEF = 99;

private:
    int _baud;
    char _rcvdChars[LINE_LENGTH]; // char buffer for serial data (single line)
    void parseSerialLine();
    void parseSerialCommand(const char[CMD_LENGTH+1], const char[LINE_LENGTH-CMD_LENGTH-1]);

    // callback for each command recieved
    void (*onCommand)(int, int[ARG_LENGTH]);
    void (*onCommandError)(const char[CMD_LENGTH+1], const char[LINE_LENGTH-CMD_LENGTH-1]);
};

#endif /* SerialCommander_h */
