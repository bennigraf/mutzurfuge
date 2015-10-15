
// defines addresses that run clients that create visual data
// (those addresses are in the local infrastructure network)
var MAWIADDRS = [
	"127.0.0.1", 
	"10.0.0.10", 
	"10.0.0.11", 
	"10.0.0.12", 
	"10.0.0.13", 
	"10.0.0.14", 
	"10.0.0.15", 
	"10.0.0.16", 
	"10.0.0.17", 
	"10.0.0.18", 
	"10.0.0.19", 
	"169.254.102.35", 
	"169.254.94.222"
];


var net = require('net');
var osc = require('node-osc');

module.exports = Controller;

function Controller() {
	this.tcpServer = null;
	this.mode = "grid";
	
	this.oscSndr = null;
}

// this server listens for 
// a) connections from mobile apps which send coords
// b) connections from client servers which want that coords (mwidyanata)
Controller.prototype.setTcpServer = function(port, host) {
	var client = new net.Socket();
	
	var server = net.createServer();
	server.listen(port, host);
	// console.log('Server listening on ' + server.address().address +':'+ server.address().port);
	var masocks = [];
	var mawiaddrs = MAWIADDRS;
	
	server.on('connection', function(sock) {
    console.log('CONNECTED: ' + sock.remoteAddress +':'+ sock.remotePort);
		for(i in mawiaddrs) {
			if(sock.remoteAddress == mawiaddrs[i]) {
				masocks.push(sock);
			}
		}
		
		sock.on('error', function(e) {
			console.log(e);
		});
		sock.on('close', function() {
			console.log('closed', sock._peername);
		})
		sock.on('data', function(data) {
			var rawdata = data;
			// console.log(this.mode);
			if(this.mode == "grid") {
				try {
					data = data.toString(); // convert from buffer to string
					data = data.replace(/\[\/TCP\]/g, "");
					data = data.replace(/\\n/g, "");
					data = JSON.parse(data);
		    	} catch (ex) {
					console.log(ex);
	        		data = null;
		    	}
				if(data && data.event == 'release') {
					// this.spawnCreature(data.id, data.x, data.y);
					this.oscSndr.send('/hit', data.id, data.x, data.y);
				}
			} else if (this.mode == "mawi") {
				for(i in masocks) {
					//console.log("sending on to mawi");
					// console.log(data.toString());
					masocks[i].write(rawdata);
				}
			}
		}.bind(this));
	}.bind(this));
}

// used for SC
Controller.prototype.setOscClient = function(port, host) {
	this.oscSndr = new osc.Client(host, port);
}

Controller.prototype.setOscServer = function(port, host) {
	this.oscServer = new osc.Server(port, host);
	
	this.oscServer.on("message", function (msg, rinfo) {
		// console.log("got osc message", msg);
		// dirty hack because oF needs to send bundles for some stupid reason...
		if(msg[0] == '#bundle') {
			msg = msg[2];
		}
		if(msg[0] == '/mode') {
			if(msg[1] != null) {
				this.mode = msg[1]; // grid or mawi right now
				console.log("setting mode to ", msg[1]);
			}
		}
	}.bind(this));
}


var c = new Controller();
c.setTcpServer(12333, '0.0.0.0'); // global tcp stuff
c.setOscClient(12332, '0.0.0.0'); // CREATURES stuff (chckr-mngr)
c.setOscServer(12331, '0.0.0.0'); // global control