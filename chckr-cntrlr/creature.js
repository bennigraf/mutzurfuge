var Colr = require("tinycolor2");



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

Creature.prototype.spawn = function() {
	// a creature always spawns at 0/0, grows from there
	// but start pos is being stored for later drawing!
	console.log("spawning");
	this.tiles["0.0"] = ['set', 0]; // state, age?
	this.head = [0, 0];
	this.clr = new Colr({h: Math.random() * 360, s: 100, v: 100});
	// console.log(this.clr);
	
	this.rayProp = 0.0;
	this.rays = [];
	
	this.worldMap = []; // ndx is x.y, contains array of boardids serving this tile
}
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
	
	this.rayProp += 0.01;
	
	for(ndx in this.tiles) {
		this.tiles[ndx][1] += 1; // age of tile
	}
	
	// 'head' wanders around in a rect, but sometimes jumps a little off
	var steps = [[1.0, 0], [0, 1.0], [-1.0, 0], [0, -1.0]];
	var newTile = [0.0, 0.0];
	var nextStep = this.age + (Math.random() < 0.2) * 1;
	// console.log(nextStep);
	newTile[0] = parseInt(this.head[0]) + parseInt(steps[nextStep%4][0]);
	newTile[1] = parseInt(this.head[1]) + parseInt(steps[nextStep%4][1]);
	if(!this.worldMap[newTile[0]+"."+newTile[1]]) { // checks if tile is available to creature
		newTile = this.head;
	}
	// console.log(newTile);
	this.head = newTile;
	this.setTile(newTile);
	// console.log(this.head[1] - 10);
	
	// remove very old tiles
	for(ndx in this.tiles) {
		if(this.tiles[ndx][1] > 20) {
			delete this.tiles[ndx];
		}
	}
	
	
	// add ray from time to time
	if(this.rayProp > Math.random()) {
	// if(false) {
		this.rayProp = 0;
		var ray = {
			age: 0,
			vect: [Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 + 3], // dir x/y, speed
			tiles: [this.head],
			dying: false,
			dead: false
		};
		this.rays.push(ray);
	}
	
	// update rays
	var removableRays = [];
	for(var i = this.rays.length-1; i >= 0; i--) {
		var ray = this.rays[i];
		var lastTile = ray.tiles[ray.tiles.length-1];
		var newTile = [];
		// TODO: some jitter here
		if(!ray.dying) {
			newTile[0] = lastTile[0] + Math.round(1 * ray.vect[0] * ray.vect[2]);
			newTile[1] = lastTile[1] + Math.round(1 * ray.vect[1] * ray.vect[2]);
			// console.log(newTile);
			if(this.worldMap[newTile[0]+"."+newTile[1]]) {
				this.rays[i].tiles.push(newTile);
			} else {
				this.rays[i].dying = true;
				this.rays[i].diedAt = ray.age;
			}
		} else {
			// it's dying!!!!
			if(ray.age - ray.diedAt > 20) {
				removableRays.push(i);
			}
		}
		ray.age += 1;
	}
	// remove old rays
	for(var i = 0; i < removableRays.length; i++) {
		this.rays.splice(removableRays[i], 1);
	}
	
	////// draw stuff from here
	this.renderTiles = new Array();
	for(ndx in this.tiles) {
		var t = this.tiles[ndx];
		var c = Colr.lighten(this.clr, 5 * t[1]);
		this.renderTiles[ndx] = c;
		// console.log(ndx);
		// console.log(c);
	}
	
	for(i in this.rays) {
		var r = this.rays[i];
		var mod = 0.75;
		if(r.dying) {
			mod = mod + 1/80 * (r.age - r.diedAt);
		}
		for (var j = 0; j < r.tiles.length; j++) {
			var t = r.tiles[j];
			if(!this.renderTiles[t[0]+"."+t[1]]) {
				var co = this.clr.toHsv();
				co.s = co.s + Math.random() * -0.3; // modulate saturation
				co.s = co.s * (1-mod);
				var c = new Colr(co);
				this.renderTiles[t[0]+"."+t[1]] = c;
			}
		}
	}
	
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


