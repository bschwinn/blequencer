# BLEquencer
BLEquencer is a bluetooth/serial controlled arduino based analog sequencer.  An electron/ios app serves as the UI 
and provides control of the arduino microprocessor over a BLE or serial connection.  The arduino acts as an analog 
sequencer with 2 CV outs (0-5V) as well as a digitally generated "white noise" output.  

## The Parts
The whole thing consists of three main peices, the "firmware" or Arduino code, the electron app itself (nodejs code 
to interact with BLE and serial) and then there's the actual webapp itself where the whole UI is.

### Firmware
The Arduino code basically stores data for each of the 16 (can be increased) steps of the sequencer.  Currently this consists
of two analog values (CVs), reset flag and an enabled flag.  It also contains the timing logic to sequence through the steps 
at a controllable BPM as well as the logic to generate noise with a color setting.

### Electron
The electron app marshalls commands from the webapp's javascript to/from the BLE/serial connected arduino.

### Webapp
The web app is where all the buttons and faders are implemented and, you guessed it, it's a website.  Real buttons and 
faders are WAY cooler, I know, but I ultimately wanted to be able to use an ipad to control something remote 
(ie: a werkstatt or monotron located on a guitar pedalboard).  Also, real buttons and faders can easily be added and work in tandem 
with the software UI.  It's a natural progression too - once the software UI is working well, you can commit to solder
and shift registers and mux'ing with more confidence that it'll be useable.


## Directory Structure
* containers/electron - where the node/electron stuff is
* containers/iOS - where the iOS stuff is
* webapp - where the web stuff is (the whole UI)
* firmware - where the arduino stuff is


## Setting it all up
Settings things up is fairly straight-forward.  The first thing to start with is probably just the simple web application.  You
can definitely skip right to the electron stuff but if you're curious, the web app runs stand-alone and contains a simulator.
The electron app simply wraps this and provides connection to the hardware.  The final step is getting the "firmware" onto the Arduino.

### webapp
You can deploy/link the web app folder to any web server and browse the web app.  It will work without a container.  After 
about 5 seconds with no container registration an in-browser container/hardware simulator is launched.

### electron
To get things going in electron, you’ll need two things: NodeJS and NPM.  And you should get the latest.  Oh, and this probably only
works on a mac....Anyway, once you run the electron app, you should see it come up with a hardware simulator (mode=sim).  You 
should be able to start/stop/pause and speed up the sequencer.  After installing the firmware, we'll start up the electron app with 
the arduino.
```
cd containers/electron/
npm install
npm run bootstrap
npm run rebuild
npm run start debug=true mode=sim
```

### firmware
Setting up the firmware should be as simple as following the steps below.  Once these are done, you will be able to connect 
the electron app to the arduino.
* install arduino software if you don’t have it
* copy ./firmware/lib/BLEquencer folder to your arduino libraries folder. 
Dev’s may just want to symlink, ex: ```ln -s /Users/youruser/dev/BLEquencer/firmware/lib/BLEquencer BLEquencer)```
* open ./firmware/blequencer.ino in the arduino IDE
* download the program to your arduino

Close the electron if it's open, and run the command below substituting your device path.  You can launch with an invalid device
and it should display a list as part of the error messages.  Be sure to have the arduino connected via the serial line and that 
the serial monitor is not open.
```
cd containers/electron/
npm run start debug=true mode=ser device=/dev/XXXX
```


