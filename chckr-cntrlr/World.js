var osc = require('node-osc');
var net = require('net');

var redis = require("redis"); // used for caching worldmaps
var rClient = redis.createClient({max_attempts: 1}); 
rClient.on('error', function(e) {
	console.log(e);
});

var Colr = require("tinycolor2");
var Grid = require('./Grid.js');
// var Creature = require('./Creatures/_Creature.js');
var Creature = require('./Creatures/_ProcCreature.js');
var Spawner = require('./Spawner.js');

module.exports = World;

function World() {
	this.oscServer = null;
	this.oscSndr = null;
	this.tcpServer = null;
	this.creatures = new Array();
	this.grids = new Array();
	this.mode = "grid";
	this.baseclr;
	
	this._gridsById;
	this._creaturesByUid = { };
	
	this.worldmapCache = { };
	
	this.spawner = new Spawner(this);
}

World.prototype.worldmapFromCache = function(key, cb) {
	if(rClient.connected) {
		rClient.get(key, function(e, wm) {
			if(wm) {
				cb(wm);
			} else {
				cb(false);
			}
		});
	} else {
		cb(false);
	}
}
World.prototype.worldmapToCache = function(key, worldmap) {
	if(rClient.connected) {
		rClient.set(key, worldmap, function() {
			console.log("wrote worldmap to cache for ", key);
		});
	}
}

World.prototype.addGrid = function(gridobj) {
	var g = new Grid(gridobj.id, gridobj.size[0], gridobj.size[1]);
	g.setAddress(gridobj.address[0], gridobj.address[1]);
	if(gridobj.gravity) {
		g.setGravity(gridobj.gravity);
	}
	if(gridobj.transitions) {
		for (var i = 0; i < gridobj.transitions.length; i++) {
			var dir = gridobj.transitions[i][0] // dir
			for(j in gridobj.transitions[i][1]) {
				g.addTransition(dir, gridobj.transitions[i][1][j]);
			}
		}
	}
	g.setMarkerPos(gridobj.markerpos);
	g.setBaseColor(gridobj.baseColor);
	this.grids.push(g);
	this._updateGridMeta();
}
World.prototype._updateGridMeta = function() {
	this._gridsById = [];
	for (var i = 0; i < this.grids.length; i++) {
		this._gridsById[this.grids[i].id] = this.grids[i];

	}
}
// used to receive hits from mobile (relayed from Controller)
World.prototype.setOscServer = function(port, host) {
	this.oscServer = new osc.Server(port, host);
	
	this.oscServer.on("message", function (msg, rinfo) {
		// console.log("got osc message", msg);
		// dirty hack because oF needs to send bundles for some stupid reason...
		if(msg[0] == '#bundle') {
			msg = msg[2];
		}
		if(msg[0] == '/hit') {
			boardid = msg[1] || 0;
			xpos = msg[2] || 0.5;
			ypos = msg[3] || 0.5;
			console.log("hit!", boardid, xpos, ypos);
			// this.spawnCreature(boardid, xpos, ypos);
			this.spawner.spawn(boardid, xpos, ypos);
			
		}
		if(msg[0] == '/baseclr') {
			this.baseclr = new Colr({r: msg[1] * 255, g: msg[2] * 255, b: msg[3] * 255});
		}
		if(msg[0] == '/gridColor') {
			for (i in this.grids) {
				var c = {r: msg[1], g: msg[2], b: msg[3], a: msg[4] };
				this.grids[i].setBaseColor(c);
			}
		}
		if(msg[0] == '/fromCreature') {
			var c = this.findCreatureByUid(msg[1]);
			if(c) {
				var args = [];
				for (var i=2; i < msg.length; i++) {
					args.push(msg[i]);
				};
				c.oscMMessage(args);
			}
		}
		if(msg[0] == '/markerAmp') {
			for (i in this.grids) {
				this.grids[i].setMarkerAmp(msg[1]);
			}
		}
	}.bind(this));
}

// used for SC
World.prototype.setOscClient = function(port, host) {
	this.oscSndr = new osc.Client(host, port);
}

World.prototype.spawnCreature = function(boardid, x, y) { // x and y are 0..1 here
	console.log("DEPRECATED");
}
World.prototype.setTile = function(x, y, r, g, b) {
	var ln = 0.000000001;
	for (var i=0; i < this.grids.length; i++) {
		if(this.grids[i].hasTile(x, y)) {
			this.grids[i].setTile(x, y, r, g, b);
		}
	};
}
World.prototype.tick = function() {
	// this.spawner.autoMode(1);
	this.spawner.smartMode();
	
	var time = process.hrtime();
	time = time[0]+time[1]/1000000000;
	
	// tell sound-part it's ticking
	if(this.oscSndr) {
		this.oscSndr.send('/world/tick', 'tick');
		// console.log("tick");
	}
	
	// update creatures, remove dead ones
	
	for (var i = this.creatures.length - 1; i >= 0; i--){
		this.creatures[i].tick();
		if(!this.creatures[i].alive) {
			this.creatures.splice(i, 1);
		}
	};
	
	var time2 = process.hrtime();
	time2 = time2[0]+time2[1]/1000000000;
	// console.log("creatures:", time2 - time);
	time = time2;
	
	// clear grids, make them all white
	for(i in this.grids) {
		this.grids[i].clearTiles();
	}

	// draw stuff to grids... get worldmappedTiles from each creature which are
	// indexed by gridids already, send those to the grids
	for(i in this.creatures) {
		var c = this.creatures[i];
		if(c.alive) {
			for(gid in c.worldmappedTiles) {
				this.findGridById(gid).setTiles(c.worldmappedTiles[gid]);
			}
		}
	}
	
	var time2 = process.hrtime();
	time2 = time2[0]+time2[1]/1000000000;
	// console.log("creatures to grids:", time2 - time);
	time = time2;
	
	// send data to grids
	for (var i = 0; i < this.grids.length; i++) {
		// get the amout of action going on ont the grid
		var nsum = this.grids[i].getNormalizedSum();
		this.oscSndr.send('/grid/action', this.grids[i].id, nsum);
		// this.grids[i].sendData();
	}
	
	var time2 = process.hrtime();
	time2 = time2[0]+time2[1]/1000000000;
	// console.log("sending data:", time2 - time);
	
	// console.log(this.grids[0].tiles[0][0]);
}

World.prototype.setTileOnGrid = function(boardid, pos, col) {
	var g = this.findGridById(boardid);
	if(g.hasTile(pos)) {
		g.setTile(pos, col);
	} else {
		// console.log(pos);
		var trans = this.gridTransition(g.id, pos) // [boardid, coords]; boardid is false on no find 
		// console.log(trans);
		if(trans[0]) {
			this.setTileOnGrid(trans[0], trans[1], col);
		}
	}
}

World.prototype.findGridCoords = function(boardid, xpos, ypos) {
	var spwncrds = {found: false, x: 0, y: 0, grid: null};
	for (var i = 0; i < this.grids.length; i++) {
		var g = this.grids[i];
		if(g.id == boardid) {
			spwncrds.found = true;
			spwncrds.x = Math.round(g.width * xpos);
			spwncrds.y = Math.round(g.height * ypos);
			return [g.id, spwncrds.x, spwncrds.y];
		}
	}
	return false;
}

/*
 * checks if a tile is available in the world relative to a creature
 */
World.prototype.tileInWorld = function(creature, tile) {
	var roots = creature.roots;
	var absTileCoords = [];
	absTileCoords[0] = roots[1] + tile[0]; // roots[0] is boardid
	absTileCoords[1] = roots[2] + tile[1];
	/// fuuuuuck recursion?!
	var checker = function(boardid, tilecoords) {
		if(this.tileOnGrid(boardid, tilecoords)) {
			return true;
		} else {
			var trans = this.gridTransition(boardid, tilecoords) // [boardid, coords]; boardid is false on no find 
			if(trans[0]) {
				return checker(trans[0], trans[1]);
			} else {
				return false;
			}
		}
	}.bind(this);
	return checker(roots[0], absTileCoords);
}
/*
 * checks if a tile is on a grid (simply checking the coords against grid size)
 */
World.prototype.tileOnGrid = function(boardid, coords) {
	var g = this.findGridById(boardid);
	if(g){
		return g.hasTile(coords);
	}
	return false;
}
/*
 * returns next board from board (boardid) in a certain direction (tilecoords), or false
 */
World.prototype.gridTransition = function(boardid, tilecoords) {
	// console.log(boardid, tilecoords);
	var g = this.findGridById(boardid);
	var n = g.getNeighbour(tilecoords); // contains [boardid, 'dir']; boardid is false if no neighbour was found
	if(n[0]) {
		// tilecoords is abs coords relative to 0/0 of this board
		// with n being the neighbour, get new coords by subtracting the dim of the original board
		// (new coords is abs coords relative to 0/0 of the new board)
		var dir = n[0];
		var newCoords = tilecoords;
		if(dir == 'top') {
			newCoords[1] = this.findGridById(n[0]).height - tilecoords[1];
		} else if (dir == 'bottom') {
			newCoords[1] = tilecoords[1] - g.height;
		} else if (dir == 'left') {
			newCoords[0] = this.findGridById(n[0]).width - tilecoords[0];
		} else if (dir == 'right') {
			newCoords[0] = tilecoords[0] - g.width;
		}
		return [n[0], newCoords];
	}
	return n[0]; // returns false most likely (only if it didn't return already);
}

/* 
 * return board with certain id
 */
World.prototype.findGridById = function(id) {
	if(this._gridsById[id]) {
		return this._gridsById[id];
	}
	return false;
}
/* 
 * return creature with certain id, or false if not found
 * remove creatures that are apparently dead
 */
World.prototype.findCreatureByUid = function(uid) {
	if(this._creaturesByUid[uid]) {
		if(this._creaturesByUid[uid].alive) {
			return this._creaturesByUid[uid];
		} else {
			delete this._creaturesByUid[uid];
		}
	}	
	return false;
}

World.prototype.run = function() {
	this.interval = setInterval(function() {
		this.tick();
	}.bind(this), 66);
}
World.prototype.stop = function() {
	clearInterval(this.interval);
	this.clearTiles();
}