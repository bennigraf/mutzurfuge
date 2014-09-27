// SEEMS DEPRECATED!!!! Don't remember when I used that, but now
//// I'm sending direct udp in Grid.js...


///// this receives udp messages on lo and converts them to old-fashioned osc messages
// need this to make one thread per grid client because generating osc messages is slowwwww
// and implementing and udb client in the grid client is a little awkward
// (if I plan to do this, see https://github.com/BanTheRewind/Cinder-Asio/blob/master/samples/UdpServer/src/UdpServerApp.cpp)

var osc = require('node-osc');
var dgram = require('dgram');

var udpListenPort = process.argv[2]; // 0 is "node", 1 is "GridMsgProxy.js"
var oscSendAddress = process.argv[3];
var oscSendPort = process.argv[4];

var udpServer = dgram.createSocket('udp4');
var oscSndr = new osc.Client(oscSendAddress, oscSendPort);

var ln = 1/255 + 0.000000001; // makes floats from ints

udpServer.bind(udpListenPort);
udpServer.on('listening', function () {
    var address = udpServer.address();
    console.log('UDP Server listening on ' + address.address + ":" + address.port);
});
udpServer.on('message', function (message, remote) {
    // console.log(remote.address + ':' + remote.port +' - ' + message.length);
	// decode message, convert bytes to clr data, append them to osc message and send it
	
	// send in steps because osc has a limit in msg size (or udp?)
	for(var n = 0; n < (message.length-8)/3; n += 50) { // setting 80 tiles -> 240 color values, seems to be the max
		var msg = new osc.Message('/grid');
		msg.append("setMany"); // we're setting many tiles at once here...
		msg.append(n); // offset
		for(var i = 0; i < 150 && n*3+i < (message.length-8); i++) {
			msg.append(message[n*3 + i + 8] * ln);
		}
		oscSndr.send(msg);
	}
});

