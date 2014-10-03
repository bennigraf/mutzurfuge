var osc = require('node-osc');
var dgram = require('dgram'); // udb socket to send stuff, should be way faster than osc
var cp = require('child_process');

var twn = require('shifty');
var Colr = require("tinycolor2");



module.exports = Grid;

// a grid 'plays out' part of the world via ip/port
// defines scope on which to act
function Grid(id, w, h) {
	this.oscSndr = null;
	this.id = id;
	this.width = w;
	this.height = h;
	
	this.tiles = [];
	this.makeTiles();
	this.tempTiles = [];
	
	this._markerpos = 'tl';
		
	this.transitions = []; // a transition is ['direction', boardid]
	this._transitionsBySide = { 'top': false, 'left': false, 'bottom': false, 'right': false};

	this.v = 0.3;
	
	this.wrkr = cp.fork('GridWorker.js', [this.id, this.width, this.height]);
	this.wrkr.send(['spawn']);
	
	// this.tweenable = new twn();
	//     this.tweenable.tween({
	//       from:     1.3,
	//       to:       6.3,
	//       duration: 1000
	//     });
}
Grid.prototype.makeTiles = function() {
	this.tiles = [];
	for (var x = 0; x < this.width; x++) {
		this.tiles[x] = [];
		for (var y = 0; y < this.height; y++) {
			this.tiles[x][y] = new Colr({ r: 255, g: 255, b: 255 });
		}
	}
}
Grid.prototype.clearTiles = function() {
	for (x in this.tiles) {
		for(y in this.tiles[x]) {
			this.tiles[x][y] = new Colr({ r: 255, g: 255, b: 255 });
		}
	}
}
Grid.prototype.setAddress = function(addr, port) {
	// this.oscSndr = new osc.Client(addr, port);
	this.udpSndr = dgram.createSocket('udp4');
	this._address = addr;
	this._port = port;
	
	this.wrkr.send(['host', this._address, this._port]);
}
Grid.prototype.setGravity = function(g) {
	this.gravity = g; // 'up', 'down', 'left', 'right'
}
Grid.prototype.addTransition = function(side, id) {
	// console.log("--", side, id);
	this.transitions.push([side, id]);
	this.updateTransitionsMeta();
}
// sets _transitionsBySide from transitions for speed improvement
Grid.prototype.updateTransitionsMeta = function() {
	this._transitionsBySide = { 'top': [], 'left': [], 'bottom': [], 'right': []};
	for (var i = 0; i < this.transitions.length; i++) {
		this._transitionsBySide[this.transitions[i][0]].push(this.transitions[i][1]);
	}
}
Grid.prototype.setMarkerPos = function(markerpos) {
	this._markerpos = markerpos;
	this.wrkr.send(['markerpos', this._markerpos]);
}
// checks if tile is in range by local coords
Grid.prototype.hasTile = function(coords) {
	var x = coords[0];
	var y = coords[1];
	if(x >= 0 && x < this.width
		&& y >= 0 && y < this.height) {
		return true;
	}
	return false;
}
// gets the next neighbour in a certain direction
Grid.prototype.getNeighbour = function(coords) {
	// TODO: What happens on diagonal jumps? Are they even possible?? Or are they automatically ignored...?
	// get direction first
	var dir;
	if(coords[1] < 0) {
		dir = 'top';
	} else if (coords[1] > this.height-1) {
		dir = 'bottom';
	} else if (coords[0] < 0) {
		dir = 'left';
	} else if (coords[0] > this.width-1) {
		dir = 'right';
	}
	return [this._transitionsBySide[dir], dir];
}

Grid.prototype.setTile = function(posx, posy, col) {
	// this.wrkr.send(['setTile', pos, col]);
	this.tempTiles.push([posx, posy, col]);
}
Grid.prototype.setTiles = function(tiles) {
	this.wrkr.send(['setTiles', tiles]);
	
	this.bad_memory_leak_restart_hack();
}
// takes tiles as they are and sends them bulk wise to worker
// DEPRECATED
Grid.prototype.tilesSet = function() {
	this.wrkr.send(['setTiles', this.tempTiles]);
	this.tempTiles = [ ];
}
Grid.prototype.sendData = function() {
	this.wrkr.send(['sendData']);
}

// calculate a normalized "sum" of how much of the grid is colored
Grid.prototype.getNormalizedSum = function() {
	var sum = 0;
	for (x in this.tiles) {
		for(y in this.tiles[x]) {
			// console.log(this.tiles[x][y]._r);
			sum += this.tiles[x][y]._r + this.tiles[x][y]._g + this.tiles[x][y]._b;
		}
	}
	return 1 - sum / (this.width * this.height * 3 * 255);
}

// there is somewhere a memory leak, I assume in the worker... so I just restart
// the worker every couple of minutes to avoid that. ......
Grid.prototype.bad_memory_leak_restart_hack = function() {
	// only do this every second or so
	if(Math.random() < 1/40) {
		if(!this.lastRestart) {
			this.lastRestart = process.uptime();
		}
		if(process.uptime() - this.lastRestart > 300) {
			var restartProp = (process.uptime() - this.lastRestart - 300) / 300;
			if(Math.random() < restartProp) {
				console.log("reboot grid worker");
				this.wrkr.kill();
				this.wrkr = cp.fork('GridWorker.js', [this.id, this.width, this.height]);
				this.wrkr.send(['spawn']);
				this.wrkr.send(['host', this._address, this._port]);
				this.wrkr.send(['markerpos', this._markerpos]);
			
				this.lastRestart = process.uptime();
			}
		}
	}
	
}