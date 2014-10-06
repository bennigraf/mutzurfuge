var cp = require('child_process');
var Colr = require("tinycolor2");
var uuid = require('node-uuid');
var LilQuad = require("./lilquad.js");
var Rectr = require("./rectr.js");
var Spreadr = require("./spreadr.js");


// var RACES = ['spreadr'];
var RACES = ['bss01', 'lilquad', 'bassdr01', 'tick', 'rectr'];
// var RACES = ['rectr'];

/*
A Creature has a certain race (aka type) that defines it's behaviour and shape etc.
It spawns a thread which does all the rendering etc...
(this class only holds the reference to that thread and manages communication...)
 */
module.exports = Creature;

function Creature(env) {
	this.world = env;
	this.wrkr; // the worker process
	this.alive = true;
	this.uid = uuid.v1();
	
	this.worldMap = { };
	
	this.wrkrMsgQueue = []; // holds messages to be sent to worker while it's not ready yet
}

Creature.prototype.spawn = function(race, rootcoords) {
	// a creature always spawns at 0/0, grows from there
	// but start pos is being stored for later drawing!
	// console.log("spawning, creating a worker...");
	this.wrkr = cp.fork('Creatures/_CreatureWorker.js');
	
	// from here I have to wait until the worker is running and provide some kind
	// of callback
	
	this.qMsg(['uid', this.uid]);
	this.qMsg(['osc', this.world.oscSndr.host, this.world.oscSndr.port]);
	
	this.qMsg(['spawn']);
	
	if(!race) {
		var ndx = Math.floor(Math.random() * RACES.length);
		race = RACES[ndx];
		// race = "spreadr";
	}
	this.setRace(race);
		
	this.worldMap = { }; // ndx is x.y, contains array of boardids serving this tile
	this.worldmappedTiles = { }; 	// rendertiles mapped on worldmap, indexed by
									// grid id, containing posx, posy, colr arrays
	this.setRootCoords(rootcoords[0], rootcoords[1], rootcoords[2]); // this also sets worldmap
	this.getWorldMap(function gotworldmap(){
		this.qMsg(['worldMap', this.worldMap]);
	}.bind(this));
	// this.qMsg(['worldMap', this.worldMap]);
	
	// send spawn-message
	this.world.oscSndr.send('/creature/spawn', this.uid, this.race);
	
	this.wrkr.on('message', function worker_message(m) {
		// console.log('mothercreature:', m);
		if(m[0] == 'ready') {
			// console.log("worker ready");
			for (i in this.wrkrMsgQueue) {
				this.wrkr.send(this.wrkrMsgQueue[i]);
			}
			this.alive = true;
		}
		if(m[0] == 'renderTiles') {
			this.setRenderTiles(m[1]);
		}
		if(m[0] == 'worldmappedTiles') {
			this.setWorldmappedTiles(m[1]);
		}
		if(m[0] == 'deadnow') {
			this.wrkr.kill();
			this.world.oscSndr.send('/creature/kill', this.uid);
			this.alive = false;
			// console.log("killing me softly");
		}
	}.bind(this));
	this.wrkr.on('error', function worker_error(m){
		console.log("ERROROROROROOROORR");
		this.world.oscSndr.send('/creature/kill', this.uid);
		this.alive = false;
	}.bind(this));
	// sometimes processes get stuck apparently.. this hack 'kills' creatures whose 
	// processes vanished.
	this.wrkr.on('exit', function worker_exited() {
		// console.log("worker quit... lazy ass!");
		this.world.oscSndr.send('/creature/kill', this.uid);
		this.alive = false;
	}.bind(this))
}
// enqueue message and send once worker is ready
Creature.prototype.qMsg = function(msg, handle) {
	if(this.wrkr && this.wrkr.connected) {
		// console.log("sending to worker:", msg);
		this.wrkr.send(msg, handle);
	} else {
		// console.log("queueing:", msg);
		this.wrkrMsgQueue.push(msg);
	}
}
Creature.prototype.setColor = function(_col) {
	this.clr = _col;
}
Creature.prototype.setRace = function(_race) {
	this.race = _race;
	this.qMsg(['race', this.race]);
}
// used for SC->Creature communication
Creature.prototype.oscMMessage = function(msg) {
	this.qMsg(['oscMsg', msg]);
}

// called after renderTiles-message is received from worker
Creature.prototype.setRenderTiles = function(_rts) {
	this.renderTiles = _rts;
}
// called after worldmappedTiles-message is received from worker
Creature.prototype.setWorldmappedTiles = function(_wmts) {
	this.worldmappedTiles = _wmts;
}
// is being called once, creates 'world map' relative to this creature
// (and sends it to worker)
Creature.prototype.setRootCoords = function(boardid, x, y) {
	this.roots = [boardid, x, y];
	// this.makeWorldMap();
	
	// console.log(this.worldMap);
	// a world map saves a lot of calculations afterwards by predefining where the creature is 
	// and which tiles go on which board/grid later...
	// like: 
	// worldmap[board][dimensions.xy] where dimensions are the offsets of board relative to 0/0
	// so when drawing for each tile I only have to look up on which board it belongs instead of calculating it
}

Creature.prototype.getWorldMap = function(cb) {
	var time = process.hrtime();
	time = time[0]+time[1]/1000000000;
	
	// check if worldmap is already in cache
	var worldmapKey = this.roots[0]+'.'+this.roots[1]+'.'+this.roots[2];
	this.worldmap = this.world.worldmapFromCache(worldmapKey, function(worldMap){
		if(worldMap) {
			this.worldMap = worldMap;
			// console.log("!!!!!!!! got worldmap from cache for ", worldmapKey);
		} else {
			this.makeWorldMap();
			this.world.worldmapToCache(worldmapKey, this.worldMap);
		}
		
		var time2 = process.hrtime();
		time2 = time2[0]+time2[1]/1000000000;
		// console.log("world map gathering:", time2 - time);
		time = time2;
		
		cb();
	}.bind(this));
}
Creature.prototype.makeWorldMap = function() {
	// console.log("calculating worldmap for ",this.roots[0]+'.'+this.roots[1]+'.'+this.roots[2]);
	// find out grid the creature is on and it's dimensions
	// store in this.worldMap
	// for each transition from that grid on (and their transitions etc.) do the same
	// should do that recursive again...
	var tmpWorldMaps = {};
	var addTransition = function(board, boardoffset, rootCoord) { // args: boardid
		var g = board;
		var wm = { xspan: [0, 0], yspan: [0, 0] };
		wm.xspan[0] = rootCoord[0] * -1 + boardoffset[0];
		wm.xspan[1] = g.width - rootCoord[0] - 1 + boardoffset[0];
		wm.yspan[0] = rootCoord[1] * -1 + boardoffset[1];
		wm.yspan[1] = g.height - rootCoord[1] - 1 + boardoffset[1];
		tmpWorldMaps[g.id] = wm;
		for(t in g.transitions) {
			var transes = g.transitions[t];
			var transdir = transes[0];
			// for(i in transes[1]) {
				var newg = this.world.findGridById(transes[1]);
				var newOffset = [0, 0];
				// only go on if board is not in worldMap yet
				if(!tmpWorldMaps[transes[1]]) {
					if(transdir == 'top') {
						newOffset[0] = boardoffset[0];
						newOffset[1] = boardoffset[1] - newg.height;
					} else if (transdir == 'bottom') {
						newOffset[0] = boardoffset[0];
						newOffset[1] = boardoffset[1] + g.height;
					} else if (transdir == 'right') {
						newOffset[0] = boardoffset[0] + g.width;
						newOffset[1] = boardoffset[1];
					} else if (transdir == 'left') {
						newOffset[0] = boardoffset[0] - newg.width;
						newOffset[1] = boardoffset[1];
					}
					addTransition(newg, newOffset, rootCoord);
				}
			// }
		}
	}.bind(this);
	// execute recursive function from above
	var g = this.world.findGridById(this.roots[0]);
	addTransition(g, [0, 0], [this.roots[1], this.roots[2]]);
	// console.log(g.transitions);

	// now make super world map with indices ('x.y') mapped to boardids, whoop whoop
	for (boardid in tmpWorldMaps) {
		var twm = tmpWorldMaps[boardid];
		var xongrid = 0;
		for(var x = twm.xspan[0]; x <= twm.xspan[1]; x++) {
			var yongrid = 0;
			for(var y = twm.yspan[0]; y <= twm.yspan[1]; y++) {
				if(!this.worldMap[x+'.'+y]) {
					this.worldMap[x+'.'+y] = [[boardid, xongrid, yongrid]];
				} else {
					this.worldMap[x+'.'+y].push([boardid, xongrid, yongrid]);
				}
				yongrid += 1;
			}
			xongrid += 1;
		}
	}
	
	// console.log(this.worldMap);
}

Creature.prototype.tick = function() {
	// console.log('ctick')
	// this.qMsg(['tick']);
};
