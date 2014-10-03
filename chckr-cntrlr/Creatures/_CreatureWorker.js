var Colr = require("tinycolor2");
var uuid = require('node-uuid');

var LilQuad = require("./lilquad.js");
var Rectr = require("./rectr.js");
var Spreadr = require("./spreadr.js");
var Bassdr01 = require("./bassdr01.js");

var osc = require('node-osc');

/*
A Creature has a certain race (aka type) that defines it's behaviour and shape etc.
 */
// module.exports = Worker;

var w = new Worker();

process.send(['ready']);

process.on('message', function worker_message(m, handle){
	if(m[0] != "worldMap") {
		// console.log("worker:", m);
	} else {
		// console.log("worker: got Worldmap!");
	}
	if(m[0] == "spawn") {
		w.spawn();
	}
	if(m[0] == "race") {
		w.setRace(m[1]);
	}
	if(m[0] == "worldMap") {
		w.setWorldMap(m[1]);
	}
	if(m[0] == 'tick') {
		if(w.alive) { w.tick(); }
	}
	if(m[0] == 'uid') {
		w.uid = m[1];
	}
	if(m[0] == 'osc') {
		w.osc = new osc.Client(m[1], m[2]);
	}
	if(m[0] == 'oscMsg') {
		if(w.cr) {
			w.cr.oscMessage(m[1]);
		}
	}
});

function Worker() {
	this.osc = null; // holds osc-sender-object which sends to SC
	this.age = 0;
	this.alive = false;
	this.roots = [];
	this.tiles = { };
	this.uid = 0;
	// render tiles are what's represented to the outside world, inside we deal with tiles
	// renderTiles are created on each tick and may contain more tiles than this.tiles
	this.worldMap = {};
	this.renderTiles = { }; 
	
	// console.log("new Worker");
}

Worker.prototype.spawn = function() {
	// a Worker always spawns at 0/0, grows from there
	// but start pos is being stored for later drawing!
	// console.log("worker spawning");
	this.tiles["0.0"] = ['set', 0]; // state, age?
	this.head = [0, 0];
	this.clr = new Colr({h: Math.random() * 360, s: 100, v: 100});
	// console.log(this.clr);
	this.run();
	
}
Worker.prototype.setColor = function(_col) {
	this.clr = _col;
}
Worker.prototype.setRace = function(_race) {
	this.race = _race;
	switch (this.race) {
	case "lilquad":
		this.cr = new LilQuad(this);
		break;
	case "rectr":
		this.cr = new Rectr(this);
		break;
	case "spreadr":
		this.cr = new Spreadr(this);
		break;
	case "bassdr01":
		this.cr = new Bassdr01(this);
		break;
	default:
		break;
	}
	this.cr.spawn();
}
Worker.prototype.setWorldMap = function(wm) {
	this.worldMap = wm;
	this.alive = true;
}

Worker.prototype.tick = function() {
	// console.log("tick");
	this.age = this.age + 1;
	
	// set age of every tile +=1
	for(ndx in this.tiles) {
		this.tiles[ndx][1] += 1; // age of tile
	}
	
	// remove very old tiles
	for(ndx in this.tiles) {
		if(this.tiles[ndx][1] > 20) {
			delete this.tiles[ndx];
		}
	}
	
	// tick creature and draw stuff
	this.cr.tick();
	
	// for each renderTile, look up on worldmap which grid tiles are affected
	// and on what grid, then set those to "gridTiles" or something and send those
	// instead. This makes the world process way lighter...
	// also send simplified color object (only rgba), since ipc doesn't allow sending
	// actual objects anyways...
	process.send(['worldmappedTiles', this.worldmapiator()]);
	
	
	// kill creature after it's own tick
	// actually end the process and send the message upstream...
	if((this.age > 1 && !this.alive) || this.age > 500) {
		// console.log("killing worker");
		this.osc.send('/creature/kill', this.uid);
		process.send(['deadnow']);
		// console.log("superenddead");
		// process.exit();
	}
	
	// set head position to audio thing (grid-id in this case, map backwards in sc)
	var headStr = this.head[0] + "." + this.head[1];
	// set multiple positions!!
	for(i in this.worldMap[headStr]) {
		this.osc.send('/creature/setOutGrid', this.uid, i, this.worldMap[headStr][i][0]);
	}
};

// take the rendertiles { '13.2': Colr } and create a new array, indexed by 
// grid id's, containing the tiles to draw on those grids [posx, posy, colr]
// also simplify Colr object to contain only rgba, that should save some space...
Worker.prototype.worldmapiator = function() {
	var worldmap = { };
	
	var smplfy = function(col) {
		return { r: col._r, g: col._g, b: col._b, a: col._a }
	}
	
	rts = this.renderTiles;
	for(ndx in rts) {
		if(this.worldMap[ndx]) {
			var wmtiles = this.worldMap[ndx];
			for(j in wmtiles) {
				// this actually represents a grid + coords on that grid for this ndx
				var wmtile = wmtiles[j];
				if(!worldmap[wmtile[0]]) {
					worldmap[wmtile[0]] = [ ];
				}
				worldmap[wmtile[0]].push([wmtile[1], wmtile[2], smplfy(rts[ndx])]);
			}
		}
	}
	
	return worldmap;
}

Worker.prototype.setTile = function(tile) {
	var path = tile[0]+"."+tile[1];
	if(this.tiles[path]) {
		this.tiles[path][1] = 0;
	} else {
		this.tiles[path] = ['set', 0];
	}
}


Worker.prototype.tileIsFree = function(newPos) {
	if(newPos[0] < 0 || newPos[0] >= this.world.width ||
		newPos[1] < 0 || newPos[1] >= this.world.height) {
		return false;
	}
	return !this.world.tiles[newPos[0]][newPos[1]]['settled'];
}


Worker.prototype.run = function() {
	this.interval = setInterval(function() {
		this.tick();
		// console.log('gwtick')
	}.bind(this), 66);
}