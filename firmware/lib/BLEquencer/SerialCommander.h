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
    static const int ARG_LENGTH = 5;
    static const char LINE_END = '\n';
    
    
public:
    SerialCommander(void (*callback)(int, const int[ARG_LENGTH]), void (*errcallback)(int, const char[LINE_LENGTH-1]));
    
    // called each scan
    void begin(uint16_t);
    void update();
    void sendSpeedUpdate(int);
    void sendStepUpdate(int, int, int);
    void sendNoteUpdate(int, int);

    static const int CMD_BPM   = 1;
    static const int CMD_PLAY  = 2;
    static const int CMD_PAUSE = 3;
    static const int CMD_STOP  = 4;
    static const int CMD_RESET = 5;
    static const int CMD_NEXT  = 6;
    static const int CMD_PREV  = 7;
    static const int CMD_NOTE  = 8;
    static const int CMD_NOISE = 9;
    static const int CMD_NZCOL = 10; // noise color
    static const int CMD_MODE  = 11;
    static const int CMD_GATE  = 12;
    static const int CMD_SHMOD = 13; // sample/hold mode

    static const int CMD_UNDEF = 99;

private:
    int _baud;
    char _rcvdChars[LINE_LENGTH]; // char buffer for serial data (single line)
    bool _throttling; // currently throttling the serial line with xon/xoff
    void parseSerialLine();
    void checkBuffer();
    void parseSerialCommand(int, const char[LINE_LENGTH-1]);

    // callback for each command recieved
    void (*onCommand)(int, int[ARG_LENGTH]);
    void (*onCommandError)(int, const char[LINE_LENGTH-1]);
};

#endif /* SerialCommander_h */
