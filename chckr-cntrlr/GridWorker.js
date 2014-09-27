
var dgram = require('dgram'); // udb socket to send stuff, should be way faster than osc
var twn = require('shifty');
var Colr = require("tinycolor2");


var gw = new GridWorker(process.argv[2], process.argv[3], process.argv[4]);

process.send(['ready']);

process.on('message', function worker_message(m, handle){
	// console.log("GridWorker:", m);
	if(m[0] == 'spawn') {
		gw.spawn();
	}
	if(m[0] == 'host') {
		gw.setHost(m[1], m[2]);
	}
	if(m[0] == 'sendData') {
		gw.sendData();
	}
	if(m[0] == 'setTile') {
		gw.setTile(m[1], m[2]);
	}
	if(m[0] == 'setTiles') {
		gw.setTiles(m[1]);
	}
	if(m[0] == 'markerpos') {
		gw.setMarkerPos(m[1]);
	}
});


// the grid worker runs as thread inside a Grid. It receives tile data (Colr-
// objects), mixes them to fit the colors, and ultimately sends this data to 
// the hosts via udp. This shifts out the mixing process to a seperate thread
// which should make things more fluent on multicore machines...
function GridWorker(id, w, h) {
	this.id = id;
	
	this.width = w;
	this.height = h;
	
	this.tiles = [];
	
	this._markerpos = 'tl';
	
	this.interval = null; // interval to auto-run itself (and send own data)
}

GridWorker.prototype.spawn = function() {
	this.makeTiles();
	this.marker = this.makeMarkerFromId();
	this.udpSndr = dgram.createSocket('udp4');
	this.run();
}

GridWorker.prototype.setHost = function(host, port) {
	this._host = host;
	this._port = port;
}

GridWorker.prototype.setMarkerPos = function(mp) {
	this._markerpos = mp;
}

GridWorker.prototype.makeTiles = function() {
	this.tiles = [];
	for (var x = 0; x < this.width; x++) {
		this.tiles[x] = [];
		for (var y = 0; y < this.height; y++) {
			this.tiles[x][y] = new Colr({ r: 255, g: 255, b: 255 });
		}
	}
}
GridWorker.prototype.clearTiles = function() {
	for (x in this.tiles) {
		for(y in this.tiles[x]) {
			this.tiles[x][y] = new Colr({ r: 255, g: 255, b: 255 });
		}
	}
}

// borrowed from https://github.com/bhollis/aruco-marker/blob/master/aruco-marker.js
// description of marker codes: http://iplimage.com/blog/create-markers-aruco/
GridWorker.prototype.makeMarkerFromId = function() {
	var ids = [16, 23, 9, 14];
	var index, val, x, y;
	var marker = [[0, 0, 0, 0, 0],
		[0, 0, 0, 0, 0],
		[0, 0, 0, 0, 0],
		[0, 0, 0, 0, 0],
		[0, 0, 0, 0, 0]];

	for (y = 0; y < 5; y++) {
		index = (this.id >> 2 * (4 - y)) & 3;
		val = ids[index];
		for (x = 0; x < 5; x++) {
			if ((val >> (4 - x)) & 1) {
				marker[y][x] = 1;
			} else {
				marker[y][x] = 0;
			}
		}
	}
	return marker;
}

GridWorker.prototype.setTile = function(pos, col) {
	var white = Colr({r: 255, g: 255, b: 255});
	var c = this.tiles[pos[0]][pos[1]];
	var newc;
	col = new Colr(col);
	if(!Colr.equals(c, white)) {
		// newc = Colr({r: Math.min(c._r , col._r) , g: Math.min(c._g , col._g) , b: Math.min(c._b , col._b) });
		// newc = Colr({r: c._r/255 * col._r, g: c._g/255 * col._g, b: c._b/255 * col._b, })
		newc = Colr.mix(c, col, 50);
	} else {
		newc = col;
	}
	this.tiles[pos[0]][pos[1]] = newc;
}
GridWorker.prototype.setTiles = function(tiles) {
	for(i in tiles) {
		this.setTile([tiles[i][0], tiles[i][1]], tiles[i][2]);
	}
}

GridWorker.prototype.sendData = function() {
	var ln = 0.000000001; // this makes sure it's always floats
	// console.log("snd");
	
	this.drawMarker();
	
	// buffer all values first
	// console.log(typeof(this.tiles));
	var values = new Buffer(this.width * this.height * 3); // 8 bytes for commands?
	for (var y = 0; y < this.height; y++) {
		for (var x = 0; x < this.width; x++) {
			var tc = this.tiles[x][y];
			var rgb = tc.toRgb();
			var ndx = (y * this.width + x) * 3;
			values.writeUInt8(Math.round(rgb.r), ndx);
			values.writeUInt8(Math.round(rgb.g), ndx + 1);
			values.writeUInt8(Math.round(rgb.b), ndx + 2);
		}
	}
	
	// send over udp in steps that represent the mtu (check the value!!!)
	var mtu = 1496; // mtu - 8 needs to be dividable by 3
	for (var n = 0; n < values.length; n = n + mtu - 8) { // 8 bytes as command sequence
		// console.log(n);
		var dsize = mtu - 8;
		if(n + dsize > values.length) {
			dsize = values.length - n;
		}
		var buf = new Buffer(dsize + 8);
		// buf.fill(0);
		buf.write("grid", 0, 4, 'utf8');
		// write offset to bytes 5 to 8
		buf.writeUInt32BE(n, 4);
		values.copy(buf, 8, n, n + dsize);

		// console.log("sending", n, buf.readUInt32BE(4), buf.length, this._port, this._host);
		this.udpSndr.send(buf, 0, buf.length, this._port, this._host);
	}

	// clear tiles before next run
	// this.clearTiles();
}

GridWorker.prototype.drawMarker = function() {
	var offset = [0, 0]; // offset depends on marker position (tl/tr/br/bl)
	if(this._markerpos == 'tl') {
		offset = [1, 1];
	} else if (this._markerpos == 'tr') {
		offset = [this.width - 1 - 7, 1];
	} else if (this._markerpos == 'br') {
		offset = [this.width - 1 - 7, this.height - 1 - 7];
	} else if (this._markerpos == 'bl') {
		offset = [1, this.height - 1 - 7];
	}
	
	// marker is 5x5 2d array
	// draw marker to tiles
	for (var y = 0; y < 7; y++) {
		for (var x = 0; x < 7; x++) {
			// this draws the 'frame'
			if(x == 0 || y == 0 || x == 6 || y == 6) {
				this.tiles[x + offset[0]][y + offset[1]] = new Colr("000000");
			} else { // this draws the actual marker
				if (this.marker[y-1][x-1] == 1) {
					// omit white parts here to make marker 'transparent'
					// this.tiles[x+1][y+1] = new Colr("FFFFFF");
				} else {
					this.tiles[x + offset[0]][y + offset[1]] = new Colr("000000");
				}
			}
		}
	}
}

GridWorker.prototype.run = function() {
	this.interval = setInterval(function() {
		this.sendData();
		// console.log('gwtick')
	}.bind(this), 50);
}