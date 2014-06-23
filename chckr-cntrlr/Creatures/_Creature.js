var Colr = require("tinycolor2");
var LilQuad = require("./lilquad.js");

/*
A Creature has a certain race (aka type) that defines it's behaviour and shape etc.
 */
module.exports = Creature;

function Creature(env) {
	this.world = env;
	this.age = 0;
	this.alive = false;
	this.roots = [];
	this.tiles = [];
	// render tiles are what's represented to the outside world, inside we deal with tiles
	// renderTiles are created on each tick and may contain more tiles that this.tiles
	this.renderTiles = []; 
}

Creature.prototype.spawn = function(race) {
	// a creature always spawns at 0/0, grows from there
	// but start pos is being stored for later drawing!
	console.log("spawning");
	this.tiles["0.0"] = ['set', 0]; // state, age?
	this.head = [0, 0];
	this.clr = new Colr({h: Math.random() * 360, s: 100, v: 100});
	// console.log(this.clr);
	
	if(!race) {
		race = 'lilquad';
	}
	this.setRace(race);
	// do race-specific stuff
	this.cr.spawn();
	
	this.worldMap = []; // ndx is x.y, contains array of boardids serving this tile
}
Creature.prototype.setRace = function(_race) {
	this.race = _race;
	switch (this.race) {
	case "lilquad":
		this.cr = new LilQuad(this);
		break;
	default:
		break;
	}
}
// is being called once, creates 'world map' relative to this creature
Creature.prototype.setRootCoords = function(boardid, x, y) {
	this.roots = [boardid, x, y];
	this.makeWorldMap();
	// console.log(this.worldMap);
	// a world map saves a lot of calculations afterwards by predefining where the creature is 
	// and which tiles go on which board/grid later...
	// like: 
	// worldmap[board][dimensions.xy] where dimensions are the offsets of board relative to 0/0
	// so when drawing for each tile I only have to look up on which board it belongs instead of calculating it
	
	// only alive once initiated
	this.alive = true;
}
Creature.prototype.makeWorldMap = function() {
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
			var trans = g.transitions[t];
			var newg = this.world.findGridById(trans[1]);
			var newOffset = [0, 0];
			// only go on if trans is not set to false and board is not in worldMap yet
			if(trans[1] && !tmpWorldMaps[trans[1]]) {
				if(trans[0] == 'top') {
					newOffset[0] = boardoffset[0];
					newOffset[1] = boardoffset[1] - newg.height;
				} else if (trans[0] == 'bottom') {
					newOffset[0] = boardoffset[0];
					newOffset[1] = boardoffset[1] + g.height;
				} else if (trans[0] == 'right') {
					newOffset[0] = boardoffset[0] + g.width;
					newOffset[1] = boardoffset[1];
				} else if (trans[0] == 'left') {
					newOffset[0] = boardoffset[0] - newg.width;
					newOffset[1] = boardoffset[1];
				}
				addTransition(newg, newOffset, rootCoord);
			}
		}
	}.bind(this);
	// execute recursive function from above
	var g = this.world.findGridById(this.roots[0]);
	addTransition(g, [0, 0], [this.roots[1], this.roots[2]]);
	
	// now make super world map with indizes ('x.y') mapped to boardids, whoop whoop
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
	
}
Creature.prototype.tick = function() {
	this.age = this.age + 1;
	if(this.age > 100) {
		// this.alive = false;
	}
	
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
	// console.log(this.cr);
	this.cr.tick();
	
};
Creature.prototype.setTile = function(tile) {
	var path = tile[0]+"."+tile[1];
	if(this.tiles[path]) {
		this.tiles[path][1] = 0;
	} else {
		this.tiles[path] = ['set', 0];
	}
}


Creature.prototype.tileIsFree = function(newPos) {
	if(newPos[0] < 0 || newPos[0] >= this.world.width ||
		newPos[1] < 0 || newPos[1] >= this.world.height) {
		return false;
	}
	return !this.world.tiles[newPos[0]][newPos[1]]['settled'];
}


