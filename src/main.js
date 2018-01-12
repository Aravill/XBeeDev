const Util = require("util");
const XBeeAPI = require("xbee-api");
const DateFromat = require("dateformat");
const Events = require("events");
const MongoClient = require("mongodb").MongoClient;
const request = require("request");

const HTTPConnection = require("../config/connection.json").http;

const EventEmitter = new Events.EventEmitter();

//Prepare variable for serial port
var SerialPort = null;

//var buffer = new Array();
//var reading = false;

process.env.NODE_ENV = "production";

if (process.env.NODE_ENV == "development") {
  // If in development mode, create virtual port
  console.log(getCurrentDate(), ">> Creating virtual serial port");
  SerialPort = require("virtual-serialport");
} else {
  //Else create real serial port
  console.log(getCurrentDate(), ">> Creating physical serial port");
  SerialPort = require("serialport");
}

//API command constants
var constants = XBeeAPI.constants;
//Set XBee device to API mode
var xbeeAPI = new XBeeAPI.XBeeAPI({
  api_mode: 1
});

//Create and open new serial port
var port = new SerialPort("/dev/ttyUSB0", {
  baudRate: 9600,
  parser: xbeeAPI.rawParser()
});

//Pipe all incoming data into the XBeeAPI Parser
port.pipe(xbeeAPI.parser);
//Pipe all data from the XBeeBuild onto the serial port
xbeeAPI.builder.pipe(port);

port.on("open", function() {
  console.log(getCurrentDate(), ">> Serial port opened!");
  discoveryRequest();
});

port.on("close", function() {
  console.log(getCurrentDate(), ">> Serial port closed!")
});

xbeeAPI.parser.on("data", function(frame) {
  //console.log(getCurrentDate(), ">> Received Frame! \n", frame);
  switch (frame.command) {
    case "ND":
      EventEmitter.emit("received_frame_discovery", frame);
      break;
    default:
      EventEmitter.emit("received_frame_generic", frame);
  }
});

EventEmitter.on("received_frame_discovery", function(frame) {
  //console.log(getCurrentDate(), ">> Received discovery frame! \n \n", frame);
  /*   let device = {
      deviceId: "Zigbee" + frame.nodeIdentification.remote64,
      name: frame.nodeIdentification.nodeIdentifier,
      remote16: frame.nodeIdentification.remote16,
      remote64: frame.nodeIdentification.remote64
    }; */
  let device = {
    deviceId: "zigbee" + frame.nodeIdentification.remote64,
    protocol: "zigbee",
    friendlyName: frame.nodeIdentification.nodeIdentifier,
    deviceFunctions: [{
      name: "LED",
      type: "actor",
      friendlyName: "LED Blink Interval",
      variables: [{
        name: "LT",
        unit: "ms"
      }]
    }]
  }
  console.log(getCurrentDate(), ">> Discovered device! \n", device,
    "\n");
  console.log(getCurrentDate(), ">> Registering...");
  httpPostAsJSON(device, HTTPConnection);
});

function httpPostAsJSON(object, connection) {
  let options = {
    hostname: connection.url,
    port: connection.port,
    path: connection.path,
    method: 'POST',
    headers: {}
  };
  /*   let post = HTTP.request(options, function(resp) {
      console.log(getCurrentDate(), ">> Response Arrived");
    }); */
  try {
    request.post("http://192.168.1.16:3000/api/Devices/registerDev", object);
    //post.write("data=" + JSON.stringify(object));
    console.log(getCurrentDate(), ">> Post successful!");
    //post.end();
  } catch (e) {
    console.log(getCurrentDate(), ">> Post failed! \n", e);
    //post.end();
  }
}

function buildFrame(frameObject) {
  return xbeeAPI.buildFrame(frameObject);
}

function writeFrame(APIFrame, port) {
  port.write(APIFrame);
}

function getCurrentDate() {
  return DateFromat(new Date(),
    "mm.dd.yyyy, h:MM:ss TT")
}

function openPort(port, baudRate) {
  console.log(getCurrentDate(), ">> Attempting to open port...");
  try {
    port.open();
  } catch (e) {
    console.log(getCurrentDate(), ">> Opening failed! \n" + e);
  }
}

function closePort(port) {
  console.log(getCurrentDate(), ">> Attempting to close port...");
  try {
    port.close();
  } catch (e) {
    console.log(getCurrentDate(), ">> Closing failed! \n" + e);
  }
}

function discoveryRequest() {
  let ND = {
    type: 0x08, //AT Command
    id: 0x01,
    command: "ND",
    commandParameter: []
  }
  console.log(getCurrentDate(), ">> Commencing network discovery");
  writeFrame(buildFrame(ND), port);
}

/* //Push byte into frame buffer array
function bufferByte(byte) {
  buffer.push(byte);
}

//Attempt to build frame if complete
function buildFrame(byteArray) {
  //Are there more than 3 Bytes in the array (Has address loaded)
  if (byteArray.length > 3) {
    //Convert HEX address MSB and LSB into decimal int
    let lenghtDec = parseInt(byteArray[1] + byteArray[2], 16);
    if (byteArray.length - 4 == lenghtDec) {
      console.log("Received Frame >> " + byteArray.join(""));
      let rawFrame = Buffer.from(byteArray.join(""), "hex");
      buffer = [];
      let xbeeAPIFrame = xbeeAPI.parseFrame(rawFrame);
      xbeeAPIFrame.commandData = xbeeAPIFrame.commandData.toString("hex");
      eventEmitter.emit("received_frame", xbeeAPIFrame);
    }
  }
}

eventEmitter.on("received_frame", function(data) {
  console.log("<< Incoming Frame >>");
  console.log(data);
});

//Upon receiving data on the serial port
port.on("data", function(data) {
  console.log("From buffer: ", data);
  //Is data an XBee frame && is a frame being read
  if (data[0].toString(16) == "7e" && reading == false) {
    //Data is a new frame
    reading = true;
  }
  //If reading a frame
  if (reading == true) {
    //Was more than 1 Byte received
    if (data.length > 1) {
      //Insert each byte into frame buffer array separately
      for (var i = 0; i < data.length; i++) {
        //Store incoming buffer objects into Array as hex values
        if (data[i].toString(16).length == 1) {
          bufferByte("0" + data[i].toString(16));
        } else {
          bufferByte(data[0].toString(16));
        }
      }
    } else {
      if (data[0].toString(16).length == 1) {
        bufferByte("0" + data[0].toString(16));
      } else {
        bufferByte(data[0].toString(16));
      }
    }
  }
  //Attempt to build a frame
  buildFrame(buffer);
}); */
