#include <BLEquencer.h>
#include <SerialCommander.h>
#include <Adafruit_MCP4725.h>

Adafruit_MCP4725 dac1;
Adafruit_MCP4725 dac2;

int notes[16] =  {tonic, octave, tonic, octave, tonic, octave, tonic, octave, tonic, tonic, octave, octave, tonic, tonic, octave, octave};
int notes2[16] = {511,   1023,   1535,  2047,    2559, 3071,   3583,  4095,   3583,  3071,  2559,   2047,   1535,  1023,  511, 0};
bool resets[16] = {false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, true};

// beats and commands handler funcs (see impl below)
void handleBeat(int, int, int);
void handleCmd(int, int[]);
void handleCmdError(char[], char[]);

// create our sequencer and serial command monitor
BLEquencer BLEquencer(notes, notes2, resets, handleBeat);
SerialCommander SerialCommander(handleCmd, handleCmdError);

// initialize the serial monitor
void setup() {
  // TODO resolve this little dispute
  Serial.begin(115200);
  SerialCommander.init(115200);

  dac1.begin(0x62);
  dac2.begin(0x63);
  BLEquencer.init(2, 3, 4);
}

// update the sequencer and serial monitor
void loop() {
  BLEquencer.update();
  SerialCommander.update();
}

// sequencer beat handler - update dacs and generate a "beat" event to the serial port
void handleBeat(int step, int val1, int val2) {
  dac1.setVoltage(val1, false);
  dac2.setVoltage(val2, false);

  Serial.print("step ");
  Serial.print(step);
  Serial.print(',');
  Serial.print(val1);
  Serial.print(',');
  Serial.println(val2);
}

// command handler - issue sequencer command, update serial when necessary
void handleCmd(int cmd, int args[]) {
  bool onoff;
  switch(cmd) {
    case SerialCommander::CMD_BPM:
      // set speed and echo back to UI
      BLEquencer.setSpeed(args[0]/10); // TODO this divide by 10 should be handled a better
      Serial.print("bpm  ");
      Serial.println(args[0]);
      break;
    case SerialCommander::CMD_NOTE:
      BLEquencer.setNote(args[0], args[1], args[2], args[3]);
      break;
    case SerialCommander::CMD_PLAY:
      BLEquencer.play();
      break;
    case SerialCommander::CMD_PAUSE:
      BLEquencer.pause();
      break;
    case SerialCommander::CMD_STOP:
      BLEquencer.stop();
      break;
    case SerialCommander::CMD_RESET:
      BLEquencer.reset();
      break;
    case SerialCommander::CMD_NEXT:
      BLEquencer.next();
      break;
    case SerialCommander::CMD_PREV:
      BLEquencer.prev();
      break;
    case SerialCommander::CMD_NOISE:
      BLEquencer.setNoise((args[0]==1));
      break;
    case SerialCommander::CMD_NZCOL:
      BLEquencer.setNoiseColor(args[0]);
      Serial.print("nzcol");
      Serial.println(BLEquencer.getNoiseColor());
      break;
  }
}
void handleCmdError(char cmd[], char args[]) {
  Serial.print("SerialCommander error - cmd: ");
  Serial.print(cmd);
  Serial.print(", data: ");
  Serial.println(args);
}

