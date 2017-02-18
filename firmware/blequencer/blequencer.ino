#include <BLEquencer.h>
#include <SerialCommander.h>
#include <VoltMeter.h>
#include <Display.h>

// beats and commands handler funcs (see impl below)
void handleBeat(int);
void handleCmd(int, int[]);
void handleCmdError(char[], char[]);
void handleVoltage(float);

// create our sequencer and serial command monitor
BLEquencer seq(handleBeat);
SerialCommander commander(handleCmd, handleCmdError);
VoltMeter dmm(handleVoltage);
Display lcd = Display(3000);

// initialize the commander, DACs and sequencer
void setup() {
  // TODO can this be put into the commander????
  Serial.begin(115200);
  // init the serial commander (monitor)
  commander.begin(115200);
  // init our display
  lcd.begin(seq.getArpMode(), seq.getSampleHoldMode(), seq.getSpeed(), seq.getGateWidth());
  // init the sequencer itself
  seq.begin(2, 3, 4, 5, 0, 6, 7);
  // init the volt meter (used for calibration)
  dmm.begin(1, 250);
}

// update the sequencer and serial monitor
void loop() {
  commander.update();
  seq.update();
  lcd.update();
  dmm.update();
}

// sequencer beat handler - update dacs and generate a "beat" event to the serial port
void handleBeat(int _step) {
  commander.sendStepUpdate(_step);
}

// command handler - issue sequencer command, update serial when necessary
void handleCmd(int cmd, int args[]) {
  bool onoff;
  switch(cmd) {
    case SerialCommander::CMD_BPM:
      // set speed and echo back to UI
      commander.sendSpeedUpdate(args[0]);
      seq.setSpeed(args[0]/10.0);  // TODO this divide by 10 should be handled a better
      lcd.setSpeed(args[0]/10.0);
      break;
    case SerialCommander::CMD_NOTE:
      seq.setNote(args[0], args[1], args[2], args[3]==1);

      Serial.print("eton step = ");
      Serial.print(args[1]);
      Serial.print(", value = ");
      Serial.println(args[2]);

      break;
    case SerialCommander::CMD_PLAY:
      seq.play();
      break;
    case SerialCommander::CMD_PAUSE:
      seq.pause();
      break;
    case SerialCommander::CMD_STOP:
      seq.stop();
      break;
    case SerialCommander::CMD_RESET:
      seq.reset();
      break;
    case SerialCommander::CMD_NEXT:
      seq.next();
      break;
    case SerialCommander::CMD_PREV:
      seq.prev();
      break;
    case SerialCommander::CMD_NOISE:
      seq.setNoise((args[0]==1));
      break;
    case SerialCommander::CMD_NZCOL:
      seq.setNoiseColor(args[0]);  
      break;
    case SerialCommander::CMD_MODE:
      seq.setArpMode(args[0]==1);
      lcd.setArpMode(args[0]==1);
      break;
    case SerialCommander::CMD_GATE:
      seq.setGateWidth(args[0]);
      lcd.setGateWidth(args[0]);
      break;
    case SerialCommander::CMD_SHMOD:
      seq.setSampleHoldMode(args[0]==1);
      lcd.setSampleHoldMode(args[0]==1);
      break;
  }
}
void handleCmdError(char cmd[], char args[]) {}

void handleVoltage(float volts) {
  lcd.setVoltage(volts);
}

