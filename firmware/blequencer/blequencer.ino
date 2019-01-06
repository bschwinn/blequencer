#include <BLEquencer.h>
#include <SerialCommander.h>
#include <VoltMeter.h>
#include <Display.h>

// baud rate
#define THEBAUD 9600
#define PIN_GATEOUT 3
#define PIN_TRIGOUT 4
#define PIN_SHOUT 6    // PWM
#define PIN_NZOUT 2
#define PIN_ENV1OUT 8  // PWM
#define PIN_ENV2OUT 9  // PWM
#define PIN_GATEIN 5
#define PIN_SHIN 0
#define PIN_SHTRIG 7

// beats and commands handler funcs (see impl below)
void handleBeat(int, int, int);
void handleCmd(int, int[]);
void handleCmdError(char[], char[]);
void handleVoltage(float);

// create our sequencer and serial command monitor
BLEquencer seq(handleBeat);
SerialCommander commander(handleCmd, handleCmdError);
VoltMeter dmm = VoltMeter(handleVoltage);
Display lcd = Display(3000);

// initialize the commander, DACs and sequencer
void setup() {
    // TODO can this be put into the commander????
    Serial.begin(THEBAUD);
    // init the serial commander (monitor)
    commander.begin(THEBAUD);
    // init our display
    lcd.begin(seq.getArpMode(), seq.getEffectsAlgo(), seq.getSpeed(), seq.getGateWidth());
    // init the sequencer itself
    seq.begin(PIN_GATEOUT, PIN_TRIGOUT, PIN_NZOUT, PIN_GATEIN, PIN_SHIN, PIN_SHTRIG, PIN_SHOUT, PIN_ENV1OUT, PIN_ENV2OUT);
    // init the volt meter (used for calibration)
    dmm.begin(1, 500, 250);
}

// update the sequencer and serial monitor
void loop() {
    unsigned long currMicros = micros();
    unsigned long currMillis = currMicros/1000;
    commander.update(currMicros, currMillis);
    seq.update(currMicros, currMillis);
    lcd.update(currMicros, currMillis);
    dmm.update(currMicros, currMillis);
}

// sequencer beat handler - update dacs and generate a "beat" event to the serial port
void handleBeat(int _step, int val1, int val2) {
    commander.sendStepUpdate(_step, val1, val2);
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
      commander.sendNoteUpdate(args[1], args[2]);
      seq.setNote(args[0], args[1], args[2]);
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
      seq.setEffectsAlgo(args[0]);
      lcd.setEffectsAlgo(args[0]);
      break;
    case SerialCommander::CMD_STRST:
      seq.setStepReset(args[0], args[1]==1);
      break;
    case SerialCommander::CMD_STENB:
      seq.setStepEnabled(args[0], args[1]==1);
      break;
    case SerialCommander::CMD_ADSR: {
        if (args[1]=='0') {
            seq.setAttackRate(args[0], args[2]);
        } else if (args[1]=='1') {
            seq.setDecayRate(args[0], args[2]);
        } else if (args[1]=='2') {
            seq.setSustainLevel(args[0], args[2]);
        } else if (args[1]=='3') {
            seq.setReleaseRate(args[0], args[2]);
        }
        break;
    }
    case SerialCommander::CMD_DUMP:
      Serial.print("conf ");
      Serial.print(seq.getArpMode());
      Serial.print(',');
      Serial.print(seq.getEffectsAlgo());
      Serial.print(',');
      Serial.print(seq.getNoise());
      Serial.print(',');
      Serial.print(seq.getNoiseColor());
      Serial.print(',');
      Serial.print((int)(seq.getSpeed()*10));
      Serial.print(',');
      Serial.println(seq.getGateWidth());
      for( int i=0; i<16; i++ ) {
        Serial.print("stcnf ");
        Serial.print(i);
        Serial.print(',');
        Serial.print(seq.getStepNote(i, 1));
        Serial.print(',');
        Serial.print(seq.getStepNote(i, 2));
        Serial.print(',');
        Serial.println(seq.getStepReset(i));
      }
      break;
  }
}
void handleCmdError(char cmd[], char args[]) {}

void handleVoltage(float volts) {
  lcd.setVoltage(volts);
}

