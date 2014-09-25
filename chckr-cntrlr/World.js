var osc = require('node-osc');
var net = require('net');
var Colr = require("tinycolor2");

var Grid = require('./Grid.js');
var Creature = require('./Creatures/_Creature.js');

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
}

World.prototype.addGrid = function(gridobj) {
	var g = new Grid(gridobj.id, gridobj.size[0], gridobj.size[1], gridobj.pos[0], gridobj.pos[1]);
	g.setAddress(gridobj.address[0], gridobj.address[1]);
	if(gridobj.gravity) {
		g.setGravity(gridobj.gravity);
	}
	if(gridobj.transitions) {
		for (var i = 0; i < gridobj.transitions.length; i++) {
			var dir = gridobj.transitions[i][0] // dir
			for(j in gridobj.transitions[i][1]) {
				// console.log(dir, gridobj.transitions[i][1][j]);
				g.addTransition(dir, gridobj.transitions[i][1][j]);
			}
			// g.addTransition(gridobj.transitions[i][0], gridobj.transitions[i][1]);
		}
	}
	this.grids.push(g);
	this._updateGridMeta();
}
World.prototype._updateGridMeta = function() {
	this._gridsById = [];
	for (var i = 0; i < this.grids.length; i++) {
		this._gridsById[this.grids[i].id] = this.grids[i];

	}
}
// used to receive hits from mobile
World.prototype.setOscServer = function(port, host) {
	this.oscServer = new osc.Server(port, host);
	
	this.oscServer.on("message", function (msg, rinfo) {
		console.log("got osc message", msg)
		// dirty hack because oF needs to send bundles for some stupid reason...
		if(msg[0] == '#bundle') {
			msg = msg[2];
		}
		if(msg[0] == '/hit') {
			boardid = msg[1] || 0;
			xpos = msg[2] || 0.5;
			ypos = msg[3] || 0.5;
			console.log("hit!", boardid, xpos, ypos);
			this.spawnCreature(boardid, xpos, ypos);
		}
		if(msg[0] == '/mode') {
			if(msg[1] != null) {
				this.mode = msg[1]; // grid or mawi right now
				console.log("setting mode to ", msg[1]);
			}
		}
		if(msg[0] == '/baseclr') {
			this.baseclr = new Colr({r: msg[1] * 255, g: msg[2] * 255, b: msg[3] * 255});
		}
	}.bind(this));
}
// used for SC
World.prototype.setOscClient = function(port, host) {
	this.oscSndr = new osc.Client(host, port);
}
// this server listens for 
// a) connections from mobile apps which send coords
// b) connections from client servers which want that coords (mwidyanata)
World.prototype.setTcpServer = function(port, host) {
	var client = new net.Socket();
	
	var server = net.createServer();
	server.listen(port, host);
	// console.log('Server listening on ' + server.address().address +':'+ server.address().port);
	var masocks = [];
	var mawiaddrs = ["127.0.0.1", "10.0.0.10", "10.0.0.11", "10.0.0.12", "10.0.0.13", "10.0.0.14", "10.0.0.15", "10.0.0.16", "10.0.0.17", "10.0.0.18", "10.0.0.19", "169.254.102.35", "169.254.94.222"];
	
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
		sock.on('data', function(data) {
			var rawdata = data;
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
				console.log(data);
				if(data && data.event == 'release') {
					this.spawnCreature(data.id, data.x, data.y);
				}
			} else if (this.mode == "mawi") {
				for(i in masocks) {
					//console.log("sending on to mawi");
					console.log(data.toString());
					masocks[i].write(rawdata);
				}
			}
		}.bind(this));
	}.bind(this));
}
World.prototype.spawnCreature = function(boardid, x, y) { // x and y are 0..1 here
	var c = new Creature(this);
	var spwnCoords = this.findGridCoords(boardid, x, y);
	if(spwnCoords) {
		c.spawn();
		c.setRootCoords(spwnCoords[0], spwnCoords[1], spwnCoords[2]);
		if(this.baseclr) {
			c.setColor(this.baseclr);
		}
		this.creatures.push(c);
	} else {
		console.log("couldn't find point for creature");
	}
}
World.prototype.autoMode = function() {
	var cpg = 3; // max creatures per grid
	// counts creatures per grid
	// if there are less than 3 creatures per grid, maybe spawn one
	// creatures have limited life spans, so they die anyways
	var gridCreatureCounts = {};
	for (i in this.creatures) {
		if(!gridCreatureCounts[this.creatures[i].roots[0]]) {
			gridCreatureCounts[this.creatures[i].roots[0]] = 1;
		} else {
			gridCreatureCounts[this.creatures[i].roots[0]] += 1;
		}
	}
	for(i in this.grids) {
		var g = this.grids[i];
		if(!gridCreatureCounts[g.id]) {
			gridCreatureCounts[g.id] = 0;
		}
		var spawnProp = (1 - Math.min(cpg, gridCreatureCounts[g.id]) / cpg) * 0.04; // 0.1 to 0
		if(Math.random() < spawnProp) {
			this.spawnCreature(g.id, Math.random(), Math.random());
		}
	}
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
	// this.autoMode();
	
	var time = process.hrtime();
	time = time[0]+time[1]/1000000000;
	// update creatures, remove dead ones
	// console.log("tick");
	
	// tell sound-part it's ticking
	if(this.oscSndr) {
		this.oscSndr.send('/world', 'tick');
	}
	
	
	var toDie = new Array();
	// console.log(this.creatures.length);
	for (var i = 0; i < this.creatures.length; i++) {
		this.creatures[i].tick();
		if(!this.creatures[i].alive) {
			toDie.push(i);
		}
	}
	// reverse to not mess up indizes before deletion
	// (assumes that the values of toDie are sorted ascending)
	// to be sure, sort first, see http://de.selfhtml.org/javascript/objekte/array.htm#sort
	var numsort = function (a, b) { return a - b; };
	if(toDie.length > 0) {
		toDie.sort(numsort);
		for (var i = toDie.length - 1; i >= 0; i--) {
			var creatureIndex = toDie[i];
			this.creatures.splice(creatureIndex, 1);
		}
	}
	
	var time2 = process.hrtime();
	time2 = time2[0]+time2[1]/1000000000;
	// console.log(time2 - time);
	
	// clear grids, make them all white
	for(i in this.grids) {
		this.grids[i].clearTiles();
	}
	
	// "draw" stuff - get renderTiles from each creature, write it into tiles of grids, tell grids to send data
	for(i in this.creatures) {
		if(this.creatures[i].alive) {
			rts = this.creatures[i].renderTiles;
			for(ndx in rts) {
				if(this.creatures[i].worldMap[ndx]) {
					var wmtiles = this.creatures[i].worldMap[ndx];
					for(j in wmtiles) {
						var wmtile = wmtiles[j];
						var g = this.findGridById(wmtile[0]);
						g.setTile([wmtile[1], wmtile[2]], rts[ndx]);
					}
				}
			}
		}
	}
	var time2 = process.hrtime();
	time2 = time2[0]+time2[1]/1000000000;
	// console.log(time2 - time);
	
	for (var i = 0; i < this.grids.length; i++) {
		// get the amout of action going on ont the grid
		var nsum = this.grids[i].getNormalizedSum();
		this.oscSndr.send('/grid/action', this.grids[i].id, nsum);
		this.grids[i].sendData();
	}
	
	var time2 = process.hrtime();
	time2 = time2[0]+time2[1]/1000000000;
	// console.log(time2 - time);
	
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

World.prototype.run = function() {
	this.interval = setInterval(function() {
		this.tick();
	}.bind(this), 50);
	
}
// World.prototype.stop = function() {
// 	clearInterval(this.interval);
// 	this.clearTiles();
// }