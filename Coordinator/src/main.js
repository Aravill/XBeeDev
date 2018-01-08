const Util = require("util");
const SerialPort = require("serialport");
const XBeeAPI = require("xbee-api");
const EventEmmiter = require("events");

//API command constants
var constants = XBeeAPI.constants;
//Set XBee device to API mode
var xbeeAPI = new XBeeAPI.XBeeAPI({
  api_mode: 1
});

//Create instance of a serial port (opens serial port)
var port = new SerialPort("/dev/ttyUSB1", {
  baudRate: 9600,
  parser: xbeeAPI.rawParser()
});

//xbeeAPI.builder.pipe(port);
//port.pipe(parser);

//On open event of serial port, create a frame and write it
port.on("open", function() {
  console.log("Serial port opened! \n");
  let frameObject = {
    //Frame type is AT COMMAND (change device parameter)
    type: constants.FRAME_TYPE.REMOTE_AT_COMMAND_REQUEST, //Or type: 0x17 with HEX syntax
    //Frame ID - optional
    id: 0x81,
    //64 bit destination address (always starts with 00)
    destination64: "0013A20041511C66",
    //16 bit destination address - optional, "FFFE" is default
    destination16: "fffe",
    //Remote command options - optional, "0x02" is default
    remoteCommandOptions: 0x02,
    //Value name
    command: "NJ",
    //Value itself
    commandParameter: [0xDD]
  };
  console.log("Frame written! \n");
  //Write frame to device
  port.write(xbeeAPI.buildFrame(frameObject));
});

port.on("data", function(data) {
  if (data[0].toString(16) == "7e") {
    var buffer = new Buffer(data.buffer);
  }
  console.log("received data >>", buffer);
});
